import { splitPrefixedName } from '@src/utilities/prefixed-name';
import { getLocalPartAndQuery } from '@src/utilities/uri';
import { ValueKind } from '@src/utilities/value-kind';
import { LiteralDatatypes } from './literal-datatypes';
import { PropertyView, TermView } from '../../form-editor-model';
import { StatementCanonicalizer } from './statement-canonicalizer';
import { StatementLexer } from './statement-lexer';
import { StatementParser } from './statement-parser';
import { StatementSerializer } from './statement-serializer';
import { StatementToken } from './statement-token';
import { StatementVocabulary } from './statement-vocabulary';
import { isStatementTextProblem } from './parsed-statement-text';
import { TermDescriber } from './term-describer';
import { PillDisplay } from './term-info';
import { RDF_TYPE, XSD_STRING } from './well-known-iris';
import { EditableStatement } from '../../state/editable-statement';
import { EditableValue } from '../../state/editable-value';
import { IStatementTextService } from './statement-text-service.interface';

/**
 * A language tag such as `@en-GB`.
 */
const LANGUAGE_SUFFIX = /^@[A-Za-z]+(-[A-Za-z0-9]+)*$/;

/**
 * A datatype such as `^^xsd:date`.
 */
const DATATYPE_SUFFIX = /^\^\^\S+$/;

/**
 * Implements the {@link IStatementTextService} on the statement lexer, parser, serializer and
 * canonicalizer of the form editor.
 */
export class StatementTextService implements IStatementTextService {
	private readonly _lexer = new StatementLexer();

	private readonly _parser: StatementParser;

	private readonly _serializer: StatementSerializer;

	private readonly _canonicalizer: StatementCanonicalizer;

	private readonly _describer: TermDescriber;

	/**
	 * Create the service of a card.
	 * @param vocabulary The terms the card knows.
	 */
	constructor(readonly vocabulary: StatementVocabulary) {
		this._parser = new StatementParser(vocabulary.namespaces);
		this._serializer = new StatementSerializer(vocabulary.namespaces);
		this._canonicalizer = new StatementCanonicalizer(vocabulary);
		this._describer = new TermDescriber(vocabulary);
	}

	/**
	 * Indicate whether a text reads as the name of a resource: a prefixed name or an `<iri>`,
	 * even unclosed.
	 * @param text The text.
	 * @returns `true` for a name.
	 */
	static isName(text: string): boolean {
		return /^<[^<>\s]*>?$/.test(text) || (splitPrefixedName(text) !== undefined && !/\s/.test(text));
	}

	/**
	 * Keep a suffix only when it is a language tag or a datatype.
	 * @param suffix The suffix as typed.
	 * @returns The suffix, or an empty string.
	 */
	static validSuffix(suffix: string): string {
		return LANGUAGE_SUFFIX.test(suffix) || DATATYPE_SUFFIX.test(suffix) ? suffix : '';
	}

	canEdit(property: PropertyView): boolean {
		return property.predicate.editable && !property.values.some(value => _holdsNestedItem(value));
	}

	editableStatementOf(property: PropertyView): EditableStatement {
		return new EditableStatement(this._serializer.serializePredicate(property.predicate), property.values.map(value => this._editableValueOf(value)));
	}

	termViewsOf(property: PropertyView): Record<string, TermView> {
		return this._serializer.serializeProperty(property).terms;
	}

	canonicalTextOf(statement: EditableStatement): string {
		const predicate = statement.predicate.trim();

		if (!predicate) {
			return '';
		}

		const values = statement.values.map(value => this._valueText(value)).filter(text => text.length > 0);

		return this._canonicalizer.canonicalize([predicate, ...values].join(' '));
	}

	statementTextOf(statement: EditableStatement): string {
		const nestedNodeCount = statement.values.filter(value => value.kind === 'nestedNode').length;

		return this._serializer.toStatementText(this.canonicalTextOf(statement), nestedNodeCount);
	}

	problemOf(text: string): string | undefined {
		const parsed = this._parser.parse(text);

		return isStatementTextProblem(parsed) ? parsed.message : undefined;
	}

	valueOfTypedText(text: string, range: ValueKind): EditableValue | undefined {
		const trimmed = text.trim();

		if (!trimmed) {
			return undefined;
		}

		if (trimmed.startsWith('"') || trimmed.startsWith('(')) {
			return this._valueOfLineText(trimmed);
		}

		if (range !== 'literal' && StatementLexer.bareDatatypeOf(trimmed)) {
			return { kind: 'shorthandLiteral', text: trimmed };
		}

		if (range === 'resource' || (range === 'any' && StatementTextService.isName(trimmed))) {
			return { kind: 'resource', text: trimmed };
		}

		return { kind: 'literal', value: text, suffix: '' };
	}

	tagLabelOf(value: EditableValue): string {
		if (value.kind === 'shorthandLiteral') {
			const bare = StatementLexer.bareDatatypeOf(value.text);

			return bare ? LiteralDatatypes.of(this.vocabulary.iriOf(bare) ?? '')?.label ?? bare : 'Number';
		}

		if (value.kind !== 'literal' || !value.suffix) {
			return 'Text';
		}

		if (value.suffix.startsWith('@')) {
			return value.suffix.slice(1);
		}

		const iri = this.datatypeIriOf(value.suffix);

		return iri ? LiteralDatatypes.of(iri)?.label ?? getLocalPartAndQuery(iri) : value.suffix.slice(2);
	}

	literalProblemOf(value: EditableValue): string | undefined {
		if (value.kind === 'shorthandLiteral') {
			return StatementLexer.bareDatatypeOf(value.text.trim()) ? undefined : 'A number, or true or false';
		}

		if (value.kind !== 'literal' || !value.suffix.startsWith('^^')) {
			return undefined;
		}

		const iri = this.datatypeIriOf(value.suffix);

		return iri ? LiteralDatatypes.problemOf(iri, value.value) : undefined;
	}

	datatypeIriOf(suffix: string): string | undefined {
		if (!suffix.startsWith('^^')) {
			return undefined;
		}

		const text = suffix.slice(2);

		return text === '' ? XSD_STRING : this.vocabulary.iriOf(text);
	}

	rangeOf(predicate: string): ValueKind {
		return this.vocabulary.predicate(predicate)?.range ?? 'any';
	}

	predicateIriOf(predicate: string): string | undefined {
		return predicate === 'a' ? RDF_TYPE : this.vocabulary.iriOf(predicate);
	}

	predicateLabelOf(predicate: string, terms?: Record<string, TermView>): string {
		const view = terms?.[predicate];
		const known = this.vocabulary.predicate(predicate);

		return view?.label || known?.label || view?.prefixedName || known?.curie || predicate;
	}

	pillDisplayOf(text: string, terms?: Record<string, TermView>): PillDisplay {
		return this._describer.pillDisplayOf(text, terms);
	}

	/**
	 * Read the value a view is edited as: a blank node as a nested node, anything else from the
	 * text it is written as.
	 * @param view The value.
	 * @returns The value.
	 */
	private _editableValueOf(view: TermView): EditableValue {
		if (!view.collection && (view.nested || view.term.kind === 'bnode')) {
			return { kind: 'nestedNode' };
		}

		return this._valueOfLineText(this._serializer.serializeValue(view));
	}

	/**
	 * Read the value a text stands for: one term, or a list or several terms as source.
	 * @param text The text of the value.
	 * @returns The value.
	 */
	private _valueOfLineText(text: string): EditableValue {
		const statementText = `p ${text}`;
		const groups = this._lexer.valueGroups(this._lexer.tokenize(statementText));

		if (groups.length !== 1) {
			return { kind: 'source', text };
		}

		const group = groups[0];

		if (group.list || group.items.length !== 1) {
			return { kind: 'source', text: statementText.slice(group.start, group.end) };
		}

		return this._valueOfToken(group.items[0]);
	}

	/**
	 * Read the value of a single token.
	 * @param token The token.
	 * @returns The value.
	 */
	private _valueOfToken(token: StatementToken): EditableValue {
		switch (token.kind) {
			case 'literal':
				return { kind: 'literal', value: StatementParser.unescapeLiteral(token.value), suffix: token.suffix };
			case 'nestedNode':
				return { kind: 'nestedNode' };
			case 'iri':
				return { kind: 'resource', text: token.text };
			case 'name':
				return StatementLexer.bareDatatypeOf(token.text) ? { kind: 'shorthandLiteral', text: token.text } : { kind: 'resource', text: token.text };
			default:
				return { kind: 'source', text: token.text };
		}
	}

	/**
	 * Write a value as it stands in the statement text.
	 * @param value The value.
	 * @returns The text, empty for a blank node, which is not written in the statement text.
	 */
	private _valueText(value: EditableValue): string {
		switch (value.kind) {
			case 'literal':
				return `"${StatementSerializer.escapeLiteral(value.value)}"${StatementTextService.validSuffix(value.suffix)}`;
			case 'nestedNode':
				return '';
			default:
				return value.text.trim();
		}
	}
}

/**
 * Indicate whether a value is a list with a blank node among its items, at any depth.
 * @param view The value.
 * @returns `true` for such a list.
 */
function _holdsNestedItem(view: TermView): boolean {
	return view.collection !== undefined && view.collection.items.some(item => item.nested !== undefined || item.term.kind === 'bnode' || _holdsNestedItem(item));
}

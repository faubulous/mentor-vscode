import { formatIri } from '@src/utilities/prefixed-name';
import { PropertyView, TermView } from '../../form-editor-model';
import { StatementLexer } from './statement-lexer';
import { SerializedStatement } from './serialized-statement';
import { RDF_TYPE, XSD_NAMESPACE, XSD_STRING } from './well-known-iris';

/**
 * The datatypes of the bare numbers and booleans, by their shorthand name.
 */
const BARE_DATATYPES: Record<string, string> = {
	'xsd:boolean': `${XSD_NAMESPACE}boolean`,
	'xsd:integer': `${XSD_NAMESPACE}integer`,
	'xsd:decimal': `${XSD_NAMESPACE}decimal`,
	'xsd:double': `${XSD_NAMESPACE}double`
};

/**
 * The placeholder a blank node the statement keeps is written as in the statement text sent to
 * the host, which puts the source text of the node back in its place. The fields shown to the user
 * never contain it.
 */
export const NESTED_NODE_PLACEHOLDER = '[…]';

/**
 * Writes the properties of a resource as statement texts: the predicate, then its values
 * single-spaced, prefixed names where a prefix is declared, literals with their tag or datatype,
 * bare numbers and booleans and lists as `( … )`. Blank-node values are left out of the statement text, as they
 * are shown as nested cards below it, and collected in the serialized statement.
 */
export class StatementSerializer {
	private readonly _lexer = new StatementLexer();

	/**
	 * Create a serializer for a document.
	 * @param _namespaces Prefix to namespace IRI.
	 */
	constructor(private readonly _namespaces: Record<string, string>) { }

	/**
	 * Escape a literal value for writing between quotes.
	 * @param value The value.
	 * @returns The escaped text.
	 */
	static escapeLiteral(value: string): string {
		return value.replace(/[\\"\n\r\t]/g, character => ({ '\\': '\\\\', '"': '\\"', '\n': '\\n', '\r': '\\r', '\t': '\\t' })[character] ?? character);
	}

	/**
	 * Write a property as a statement text.
	 * @param property The property.
	 * @returns The statement text with the views of its terms and its blank-node values.
	 */
	serializeProperty(property: PropertyView): SerializedStatement {
		const model: SerializedStatement = { text: '', terms: {}, nestedNodes: [] };
		const predicate = this.serializePredicate(property.predicate);

		model.terms[predicate] = property.predicate;

		const values = property.values.map(value => this.serializeValue(value, model)).filter(text => text !== '');

		model.text = [predicate, ...values].join(' ');

		return model;
	}

	/**
	 * Write a value as it appears in a statement text.
	 * @param view The value.
	 * @param model Collects the term views and the blank nodes the statement text leaves out, when given.
	 * @returns The text of the value, empty for a blank node, which is not written in the statement text.
	 */
	serializeValue(view: TermView, model?: Pick<SerializedStatement, 'terms' | 'nestedNodes'>): string {
		if (view.collection) {
			const items = view.collection.items.map(item => this.serializeValue(item, model)).filter(text => text !== '');

			return items.length > 0 ? `( ${items.join(' ')} )` : '( )';
		}

		switch (view.term.kind) {
			case 'iri': {
				const text = view.prefixedName ?? formatIri(this._namespaces, view.term.iri);

				if (model) {
					model.terms[text] = view;
				}

				return text;
			}
			case 'literal':
				return this._literalText(view.term.value, view.term.language, view.term.datatype);
			default:
				model?.nestedNodes.push(view);

				return '';
		}
	}

	/**
	 * Write the canonical text of a statement text as the statement text for the host: the values separated
	 * by commas, lists kept whole, and one placeholder appended for every blank node the statement
	 * keeps, which the host replaces with the source text of the node.
	 * @param canonical The canonical text of the statement text, without markers for new nested nodes.
	 * @param nestedNodeCount The number of blank nodes the statement keeps.
	 * @returns The statement text.
	 */
	toStatementText(canonical: string, nestedNodeCount = 0): string {
		if (StatementLexer.isComment(canonical)) {
			return canonical;
		}

		const tokens = this._lexer.tokenize(canonical);
		const items = this._lexer.items(tokens);

		if (items.length === 0) {
			return canonical;
		}

		const values = this._lexer.valueGroups(tokens).map(group => canonical.slice(group.start, group.end));
		const placeholders = Array.from({ length: nestedNodeCount }, () => NESTED_NODE_PLACEHOLDER);
		const objects = [...values, ...placeholders];

		return objects.length > 0 ? `${items[0].text} ${objects.join(', ')}` : items[0].text;
	}

	/**
	 * Write the predicate: `a` for `rdf:type`, otherwise its prefixed name or `<iri>`.
	 * @param predicate The view of the predicate.
	 * @returns The text.
	 */
	serializePredicate(predicate: TermView): string {
		if (predicate.term.kind === 'iri') {
			return predicate.term.iri === RDF_TYPE ? 'a' : predicate.prefixedName ?? formatIri(this._namespaces, predicate.term.iri);
		}

		return predicate.prefixedName ?? '';
	}

	/**
	 * Write a literal: bare when it is a number or boolean of the matching datatype, otherwise
	 * quoted with its language tag or datatype. `xsd:string` is implied and not written.
	 * @param value The value of the literal.
	 * @param language Its language tag, if any.
	 * @param datatype Its datatype, if any.
	 * @returns The text.
	 */
	private _literalText(value: string, language: string | undefined, datatype: string | undefined): string {
		if (language) {
			return `"${StatementSerializer.escapeLiteral(value)}"@${language}`;
		}

		const bare = StatementLexer.bareDatatypeOf(value);

		if (datatype && bare && BARE_DATATYPES[bare] === datatype) {
			return value;
		}

		if (datatype && datatype !== XSD_STRING) {
			return `"${StatementSerializer.escapeLiteral(value)}"^^${formatIri(this._namespaces, datatype)}`;
		}

		return `"${StatementSerializer.escapeLiteral(value)}"`;
	}
}

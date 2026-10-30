import { splitPrefixedName } from '@src/utilities/prefixed-name';
import { getLocalPartAndQuery } from '@src/utilities/uri';
import { humanize } from '@src/utilities/string';
import { TermView } from '../../form-editor-model';
import { StatementLexer } from './statement-lexer';
import { StatementToken } from './statement-token';
import { StatementVocabulary } from './statement-vocabulary';
import { ValueKind } from '@src/utilities/value-kind';
import { StatementValueKind, PillDisplay, PredicateInfo, ValueInfo } from './term-info';
import { RDF_TYPE } from './well-known-iris';

/**
 * Tells what the tokens of a statement text denote against a vocabulary: whether the first is a predicate
 * and what it takes, what kind of value each of the others is, and how a resource is shown.
 */
export class TermDescriber {
	/**
	 * Create a describer.
	 * @param _vocabulary The vocabulary of the card.
	 */
	constructor(private readonly _vocabulary: StatementVocabulary) { }

	/**
	 * Indicate whether a value kind is rendered with a ring: every kind of resource.
	 * @param kind The value kind.
	 * @returns `true` for a resource.
	 */
	static isResourceKind(kind: StatementValueKind): boolean {
		return kind === 'vocabularyTerm' || kind === 'documentResource' || kind === 'newResource' || kind === 'externalResource';
	}

	/**
	 * Get the inlay hint for an empty value position.
	 * @param range The range of the predicate.
	 * @returns The hint.
	 */
	static ghostFor(range: ValueKind): string {
		if (range === 'literal') {
			return '"text"@en';
		}

		return range === 'resource' ? 'resource' : 'value';
	}

	/**
	 * Describe the first token of a statement text as a predicate.
	 * @param token The token, or `undefined` for an empty statement.
	 * @returns What the token denotes.
	 */
	describePredicate(token: StatementToken | undefined): PredicateInfo {
		if (!token) {
			return { error: 'A statement starts with its predicate' };
		}

		if (token.kind === 'iri') {
			const iri = _innerIri(token.text);
			const known = this._vocabulary.predicate(token.text);

			return { curie: token.text, iri, label: known?.label ?? getLocalPartAndQuery(iri), range: known?.range ?? 'any' };
		}

		if (token.kind !== 'name') {
			return { error: 'A statement starts with its predicate' };
		}

		return this._describeNamedPredicate(token.text);
	}

	/**
	 * Get the range of the predicate a token names; `any` when it is not a known predicate.
	 * @param token The predicate token.
	 * @returns The range.
	 */
	rangeOf(token: StatementToken | undefined): ValueKind {
		const info = this.describePredicate(token);

		return info.error === undefined ? info.range : 'any';
	}

	/**
	 * Describe a token in value position.
	 * @param token The token.
	 * @returns What the token denotes.
	 */
	describeValue(token: StatementToken): ValueInfo {
		switch (token.kind) {
			case 'literal':
				return { kind: 'literal' };
			case 'languageTag':
				return { kind: 'languageTag' };
			case 'nestedNode':
				return { kind: 'nestedNode' };
			case 'iri':
				return this._describeIriValue(token.text);
			case 'name':
				return this._describeNamedValue(token.text);
			default:
				return { kind: 'error', error: 'Not a value' };
		}
	}

	/**
	 * Get the IRI a name or IRI token denotes.
	 * @param token The token.
	 * @returns The IRI, or `undefined` for tokens that do not denote one.
	 */
	tokenIri(token: StatementToken): string | undefined {
		if (token.kind === 'iri') {
			return _innerIri(token.text);
		}

		if (token.kind !== 'name') {
			return undefined;
		}

		return token.text === 'a' ? RDF_TYPE : this._vocabulary.iriOf(token.text);
	}

	/**
	 * Indicate whether a token is a resource value.
	 * @param token The token.
	 * @returns `true` for a resource.
	 */
	isResourceToken(token: StatementToken): boolean {
		return (token.kind === 'name' || token.kind === 'iri') && TermDescriber.isResourceKind(this.describeValue(token).kind);
	}

	/**
	 * Indicate whether an item is deleted and skipped as a whole: a valid predicate, a resource,
	 * or a `[` typed for a new nested node.
	 * @param items The items of the statement text.
	 * @param index The index of the item.
	 * @returns `true` for an atomic item.
	 */
	isAtomicToken(items: readonly StatementToken[], index: number): boolean {
		const token = items[index];

		if (index === 0) {
			return (token.kind === 'name' || token.kind === 'iri') && this.describePredicate(token).error === undefined;
		}

		return token.kind === 'nestedNode' || this.isResourceToken(token);
	}

	/**
	 * Describe the pill of a resource written as a prefixed name or an `<iri>`.
	 * @param text The resource as written.
	 * @param terms The views of the terms the row was built from, keyed by how they are written.
	 * @returns How the pill is shown.
	 */
	pillDisplayOf(text: string, terms?: Record<string, TermView>): PillDisplay {
		const entry = this._vocabulary.resource(text);

		if (entry) {
			return { label: entry.label || text, kind: entry.kind, title: entry.curie, iconName: entry.iconName ?? terms?.[text]?.iconName };
		}

		const view = terms?.[text];

		if (view) {
			return { label: view.label ?? text, kind: 'externalResource', title: text, iconName: view.iconName };
		}

		const iri = this._vocabulary.iriOf(text);

		if (iri) {
			return { label: text, kind: 'newResource', title: `${iri} · not described yet` };
		}

		return { label: text, kind: 'error', title: 'Not a resource: use a declared prefix or an <iri>' };
	}

	/**
	 * The label of a predicate: its label in the document or vocabulary, `type` for `a`,
	 * otherwise its local name in words, or the text itself.
	 * @param text The predicate as written.
	 * @param terms The views of the terms the row was built from.
	 * @returns The label.
	 */
	predicateLabelOf(text: string, terms?: Record<string, TermView>): string {
		const label = terms?.[text]?.label ?? this._vocabulary.predicate(text)?.label;

		if (label) {
			return label;
		}

		const iri = this._vocabulary.iriOf(text);

		return iri ? humanize(getLocalPartAndQuery(iri), true) : text;
	}

	/**
	 * Describe a bare word in predicate position: a known predicate, a prefixed name with a
	 * declared prefix, or an error.
	 * @param text The word.
	 * @returns What it denotes.
	 */
	private _describeNamedPredicate(text: string): PredicateInfo {
		const known = this._vocabulary.predicate(text);

		if (known) {
			return { curie: known.curie, iri: known.iri, label: known.label, range: known.range };
		}

		const parts = splitPrefixedName(text);
		const namespace = parts ? this._vocabulary.namespaces[parts.prefix] : undefined;

		if (parts && namespace !== undefined && parts.localName) {
			return { curie: text, iri: namespace + parts.localName, label: parts.localName, range: 'any' };
		}

		if (parts && namespace === undefined) {
			return { error: `Unknown prefix "${parts.prefix}:"` };
		}

		return { error: 'Unknown predicate. ⌃Space shows suggestions' };
	}

	/**
	 * Describe an `<iri>` value: a vocabulary or local resource when known, otherwise external.
	 * @param text The IRI reference.
	 * @returns What it denotes.
	 */
	private _describeIriValue(text: string): ValueInfo {
		const iri = _innerIri(text);
		const known = this._vocabulary.resource(text);

		if (known) {
			return { kind: known.kind, label: known.label, iri: known.iri, curie: known.curie };
		}

		return { kind: 'externalResource', label: getLocalPartAndQuery(iri), iri, curie: text };
	}

	/**
	 * Describe a bare word in value position: a number or boolean, a known resource, a new
	 * prefixed name, or an error.
	 * @param text The word.
	 * @returns What it denotes.
	 */
	private _describeNamedValue(text: string): ValueInfo {
		const datatype = StatementLexer.bareDatatypeOf(text);

		if (datatype) {
			return { kind: 'shorthandLiteral', datatype };
		}

		const known = this._vocabulary.resource(text);

		if (known) {
			return { kind: known.kind, label: known.label, iri: known.iri, curie: known.curie };
		}

		const parts = splitPrefixedName(text);
		const namespace = parts ? this._vocabulary.namespaces[parts.prefix] : undefined;

		if (parts && namespace !== undefined && parts.localName) {
			return { kind: 'newResource', label: parts.localName, iri: namespace + parts.localName, curie: text };
		}

		if (parts && namespace === undefined) {
			return { kind: 'error', error: `Unknown prefix "${parts.prefix}:"` };
		}

		return { kind: 'error', error: 'Not a known term. ⇥ completes it, a space turns it into text' };
	}
}

/**
 * Strip the angle brackets of an IRI reference, tolerating a missing closing bracket.
 * @param text The IRI reference.
 * @returns The IRI.
 */
function _innerIri(text: string): string {
	return text.replace(/^<|>$/g, '');
}

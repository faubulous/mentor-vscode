/**
 * The kind of values a property takes: literals, resources (IRIs and blank nodes), or either.
 * Derived from how the property is used until a property schema says otherwise.
 */
export type ValueKind = 'literal' | 'resource' | 'any';

/**
 * What kind of values a predicate takes, as far as the host could tell, in wire form. Shared by
 * the form editor host and webview; free of imports from 'vscode'.
 */
export interface ValueKindHint {
	/**
	 * The kind of values the predicate takes.
	 */
	kind: ValueKind;

	/**
	 * Where the kind was read from: so far only the values the predicate has in the document.
	 */
	source: 'usage';
}

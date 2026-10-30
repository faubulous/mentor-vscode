import { TermRef } from './term-ref';

/**
 * A value of a statement as an edit states it. Values written in the document are referred to
 * rather than restated, so they keep their text, their nested statements and their comments.
 */
export type StatementValue =
	/**
	 * A value written in the document, kept as it is written. `anchor` is the offset its object
	 * starts at, as the snapshot reports it; among the items of a new list, the offset an item of
	 * a list already written starts at.
	 */
	| { kind: 'existing'; anchor: number }
	/**
	 * A new IRI, literal or labelled blank node.
	 */
	| { kind: 'term'; term: TermRef }
	/**
	 * A new list of values.
	 */
	| { kind: 'list'; items: StatementValue[] };

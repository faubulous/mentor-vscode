import { BlankNode, Literal, NamedNode } from '@rdfjs/types';

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
	| { kind: 'term'; term: NamedNode | BlankNode | Literal }
	/**
	 * A new list of values.
	 */
	| { kind: 'list'; items: StatementValue[] }
	/**
	 * A new anonymous blank node with its statements, written in place as `[ … ]`.
	 */
	| { kind: 'node'; statements: { predicate: string; values: StatementValue[] }[] }
	/**
	 * A copy of a value written under the predicate, or of an item of a list written there, as it
	 * is written; the value itself stays. `anchor` is the offset the value starts at.
	 */
	| { kind: 'copy'; anchor: number };

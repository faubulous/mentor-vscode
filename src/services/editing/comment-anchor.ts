import { BlankNode, NamedNode } from '@rdfjs/types';

/**
 * A run of comment lines of the document, named by what it is written about, as the form editor
 * shows it. Free of imports from 'vscode'; the RDF/JS terms in it cross from the webview as plain
 * data and are revived on arrival.
 */
export type CommentAnchor =
	/**
	 * A run of the comments above a resource of its own, by its index among them, which blank
	 * lines separate.
	 */
	| { kind: 'resource'; subject: NamedNode | BlankNode; run: number }
	/**
	 * The comments at the head of a blank node written inside another, before its first statement.
	 */
	| { kind: 'node'; subject: BlankNode }
	/**
	 * The comments above a property of a resource.
	 */
	| { kind: 'property'; subject: NamedNode | BlankNode; predicate: string }
	/**
	 * The comments above a value of a property, written at an offset.
	 */
	| { kind: 'value'; subject: NamedNode | BlankNode; predicate: string; anchor: number }
	/**
	 * The comments after the last statement of a resource, before the `.` or `]` that closes its
	 * statements.
	 */
	| { kind: 'end'; subject: NamedNode | BlankNode }
	/**
	 * A run of the comments closing the document, by its index among them.
	 */
	| { kind: 'document'; run: number };

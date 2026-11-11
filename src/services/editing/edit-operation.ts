/**
 * The mutations the form editor can request. Consumed by the edit synthesis layer, which
 * turns them into minimal text edits. Free of imports from 'vscode'; the RDF/JS terms in them
 * cross from the webview as plain data and are revived on arrival.
 */

import { BlankNode, NamedNode } from '@rdfjs/types';
import { StatementValue } from './statement-value';

/**
 * A single mutation of the document.
 */
export type EditOperation =
	/**
	 * Make `values` the values of a predicate of the subject, in the syntax of the document. Written
	 * values that are not listed go with their nested statements; listed ones stay where they are
	 * written. A new value is written next to the listed value before it, else before the one after
	 * it, else in the place of the first value that goes, else as a new predicate of the subject.
	 * Written values keep their order relative to values written elsewhere, such as in another
	 * block or graph; within one statement they take the order given. No values removes the
	 * predicate.
	 */
	| { op: 'setValues'; subject: NamedNode | BlankNode; predicate: string; values: StatementValue[] }
	/**
	 * Write the values of a predicate of the subject under another predicate, which the subject
	 * must not carry yet.
	 */
	| { op: 'setPredicate'; subject: NamedNode | BlankNode; predicate: string; newPredicate: string }
	/**
	 * Remove a resource described at the top level of the document: every block of statements about
	 * it goes as a whole, with the blank nodes written in it and the comments directly above it.
	 * Statements of other resources that refer to it stay.
	 */
	| { op: 'removeResource'; subject: NamedNode | BlankNode };


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
	 * Write the statement of a predicate of the subject before or after the statement of another
	 * of its predicates, with the comments written above it and the comment ending its line. Both
	 * predicates must be written once, in the same block; the separators and line breaks of the
	 * block stay where they are.
	 */
	| { op: 'moveProperty'; subject: NamedNode | BlankNode; predicate: string; target: string; placement: 'before' | 'after' }
	/**
	 * Remove a resource described at the top level of the document: every block of statements about
	 * it goes as a whole, with the blank nodes written in it and the comments directly above it.
	 * Statements of other resources that refer to it stay.
	 */
	| { op: 'removeResource'; subject: NamedNode | BlankNode }
	/**
	 * Declare a prefix for a namespace, written like the declarations of the document: after them,
	 * or in alphabetical order where the settings keep them sorted. The prefix is used by the terms
	 * the other operations of the same action write, wherever it is listed among them. Declaring a
	 * prefix the document already declares for the namespace changes nothing.
	 */
	| { op: 'declarePrefix'; prefix: string; namespace: string };


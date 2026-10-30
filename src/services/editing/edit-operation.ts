/**
 * The mutations the form editor can request. Consumed by the edit synthesis layer, which
 * turns them into minimal text edits. Plain JSON, free of imports from 'vscode'.
 */

import { StatementValue } from './statement-value';
import { TermRef } from './term-ref';

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
	| { op: 'setValues'; subject: TermRef; predicate: string; values: StatementValue[] }
	/**
	 * Write the values of a predicate of the subject under another predicate, which the subject
	 * must not carry yet.
	 */
	| { op: 'setPredicate'; subject: TermRef; predicate: string; newPredicate: string };

/**
 * Why an edit was not applied.
 */
export type EditRejectionReason =
	| 'staleVersion'
	| 'readOnly'
	| 'parseErrors'
	| 'notFound'
	| 'ambiguous'
	| 'unsupportedConstruct'
	| 'unsupportedSyntax'
	| 'invalidTerm'
	| 'verificationFailed'
	| 'applyFailed'
	| 'wouldRemoveSubject';

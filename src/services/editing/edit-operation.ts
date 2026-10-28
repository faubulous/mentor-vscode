/**
 * The mutations the form editor can request. Consumed by the edit synthesis layer, which
 * turns them into minimal text edits. Plain JSON, free of imports from 'vscode'.
 */

import { CommentAnchor } from './comment-anchor';
import { TermRef } from './term-ref';

/**
 * A single mutation of the document.
 */
export type EditOperation =
	| { op: 'deleteProperty'; subject: TermRef; predicate: string }
	/**
	 * Move a predicate with its values before another predicate of the subject, or after the last one when `before` is absent.
	 */
	| { op: 'moveProperty'; subject: TermRef; predicate: string; before?: string }
	/**
	 * `after` places the new resource right after the block of that resource rather than at the end.
	 */
	| { op: 'addSubject'; iri: string; initial: { predicate: string; value: TermRef }[]; graph?: string; after?: TermRef }
	| { op: 'deleteSubject'; subject: TermRef }
	| { op: 'renameSubject'; subject: TermRef; iri: string }
	| { op: 'addNestedNode'; parent: TermRef; predicate: string; initial: { predicate: string; value: TermRef }[] }
	| { op: 'addNamespace'; prefix: string; iri: string }
	/**
	 * Rewrite the statement of a predicate from one line of Turtle: the predicate with its objects,
	 * without the subject and the final period. A `[…]` (or `[]`) among the objects stands for a
	 * blank node already written under the predicate, in order. Without `predicate` the line
	 * states a new predicate of the subject.
	 */
	| { op: 'replaceStatement'; subject: TermRef; predicate?: string; text: string }
	/**
	 * Replace the comment lines written above the first statement of a predicate; an empty list
	 * removes them.
	 */
	| { op: 'setPropertyComments'; subject: TermRef; predicate: string; comments: string[] }
	/**
	 * Replace the run of comment lines at an anchor, or write it when there is none; an empty
	 * text removes it.
	 */
	| { op: 'setComment'; at: CommentAnchor; text: string }
	/**
	 * Write a comment block after or before the block of a resource, or at the end of the
	 * document when neither is named.
	 */
	| { op: 'addComment'; after?: TermRef; before?: TermRef; text: string }
	/**
	 * Remove the run of comment lines at an anchor.
	 */
	| { op: 'deleteComment'; at: CommentAnchor };

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
	| 'inUse'
	| 'invalidTerm'
	| 'verificationFailed'
	| 'applyFailed'
	| 'wouldRemoveSubject';

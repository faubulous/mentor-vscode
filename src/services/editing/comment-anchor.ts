/**
 * Where a comment stands in the document, as the form addresses it. Plain JSON, free of
 * imports from 'vscode'.
 */

import type { ValueLocation } from './statement-locator';
import type { TermRef } from './term-ref';

/**
 * The run of comment lines an operation acts on: the lines above the block of a resource, above
 * the first statement of a predicate, above a later value of a predicate, or a run among the
 * comments that close the document. Runs are separated by blank lines: a resource run is named
 * by its index among the runs above the resource (the last one, nearest the resource, when left
 * out), and a document run by the index of any of its lines among the lines of the snapshot's
 * trailing comments.
 */
export type CommentAnchor =
	| { kind: 'resource'; subject: TermRef; run?: number }
	| { kind: 'property'; subject: TermRef; predicate: string }
	| { kind: 'value'; at: ValueLocation }
	| { kind: 'document'; index: number };

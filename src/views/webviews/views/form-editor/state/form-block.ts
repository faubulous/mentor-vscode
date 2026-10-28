import { ResourceId, ResourceSummary, TermRef } from '../form-editor-model';

/**
 * Where a comment block stands: over a resource, as one of the runs of comments written above it,
 * or at the end of the document, named by the index of its first line among the closing comments.
 */
export type CommentBlockAnchor =
	| { kind: 'resource'; resourceId: ResourceId; subject: TermRef; run: number }
	| { kind: 'document'; index: number };

/**
 * One block of the form: a resource entry, or a comment written between resources. Each run of
 * comment lines, the runs being separated by blank lines, is a block of its own: those above a
 * resource stand over its entry, and those after the last resource close the document.
 */
export type FormBlock =
	| { kind: 'resource'; id: string; resource: ResourceSummary }
	| { kind: 'comment'; id: string; text: string; anchor: CommentBlockAnchor };

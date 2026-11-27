import { BlankNode, NamedNode } from '@rdfjs/types';
import { CommentAnchor } from '@src/services/editing/comment-anchor';
import { ResourceListItemData } from '../form-editor-model';

/**
 * One block of the form: a resource entry, or a comment written between resources. Each run of
 * comment lines, the runs being separated by blank lines, is a block of its own: those above a
 * resource stand over its entry, and those after the last resource close the document.
 */
export type FormBlock =
	| { kind: 'resource'; id: string; resource: ResourceListItemData }
	| CommentFormBlock;

/**
 * A run of comment lines written between resources.
 */
export interface CommentFormBlock {
	/**
	 * Tells a comment block apart.
	 */
	kind: 'comment';

	/**
	 * The key the block is rendered by.
	 */
	id: string;

	/**
	 * The lines of the comment.
	 */
	lines: string[];

	/**
	 * Where the comment is written: above a resource or at the end of the document.
	 */
	anchor: CommentAnchor;

	/**
	 * The resource the comment stands above, or the document for a comment closing it.
	 */
	subject: NamedNode | BlankNode;
}

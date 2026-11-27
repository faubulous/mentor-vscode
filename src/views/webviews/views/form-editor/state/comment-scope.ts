import { BlankNode, NamedNode } from '@rdfjs/types';

/**
 * The comment asked for in a row, as Ctrl+/ asks for it: the one above its property, or the one
 * above its value with the given index.
 */
export type CommentDraft = 'property' | number;

/**
 * Where the comments of a row are written: the resource and predicate of the row, the card that
 * shows it, the document version its statements belong to, and the comment asked for in it.
 */
export interface CommentScope {
	/**
	 * The resource of the row.
	 */
	subject: NamedNode | BlankNode;

	/**
	 * The resource of the card that shows the row.
	 */
	card: NamedNode | BlankNode;

	/**
	 * The IRI of the predicate of the row, once it has one.
	 */
	predicate?: string;

	/**
	 * The document version the statements belong to.
	 */
	version: number;

	/**
	 * The comment asked for in the row, which shows with the focus, empty where it is not written.
	 */
	draft?: CommentDraft;

	/**
	 * Ask for a comment in the row, as Ctrl+/ or Add comment do; absent where the row only reads.
	 */
	onDraft?: (draft: CommentDraft) => void;

	/**
	 * Called when the comment asked for is left.
	 */
	onDraftDone?: () => void;
}

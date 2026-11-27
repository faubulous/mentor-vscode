import { BlankNode, NamedNode } from '@rdfjs/types';

/**
 * Where the comments of a row are written: the resource and predicate of the row, the card that
 * shows it and the document version its statements belong to.
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
}

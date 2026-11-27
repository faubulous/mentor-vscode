import { BlankNode, NamedNode } from '@rdfjs/types';
import { TermData } from '../form-editor-model';
import { CommentField } from './comment-field';

/**
 * Where the comments of the values of a row are written: the resource and predicate of the row,
 * the card that shows it and the document version its statements belong to.
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

/**
 * Properties of the {@link ValueComment} component.
 */
export interface ValueCommentProps {
	/**
	 * The value, with the comment lines written above it.
	 */
	view: TermData;

	/**
	 * Where the comment is written.
	 */
	scope: CommentScope;

	/**
	 * The class name that gives the comment its look where it stands.
	 */
	className?: string;
}

/**
 * The comment written above a value, edited in place where the value is written in the document.
 * @param props The value and where its comment is written.
 * @returns The comment, or nothing for a value without one.
 */
export function ValueComment({ view, scope, className = 'statement-comment statement-value-comment' }: ValueCommentProps): React.JSX.Element | null {
	if (!view.comments) {
		return null;
	}

	const { subject, card, predicate, version } = scope;
	const anchor = predicate !== undefined && view.anchor !== undefined ? { kind: 'value' as const, subject, predicate, anchor: view.anchor } : undefined;

	return <CommentField className={className} label="Comment on the value" lines={view.comments} anchor={anchor} subject={subject} card={card} version={version} />;
}

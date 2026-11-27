import { BlankNode, NamedNode } from '@rdfjs/types';
import { TermData } from '../form-editor-model';
import { getCommentTarget } from '../state/comment-editor';
import { CommentField } from './comment-field';

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

/**
 * Properties of the {@link ValueComment} component.
 */
export interface ValueCommentProps {
	/**
	 * The value, with the comment lines written above it.
	 */
	view: TermData;

	/**
	 * The index of the value among the values of its row.
	 */
	index: number;

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
 * The comment written above a value, edited in place where the value is written in the document;
 * once asked for, an empty field above a value without a comment, which writes one.
 * @param props The value and where its comment is written.
 * @returns The comment, or nothing for a value without one.
 */
export function ValueComment({ view, index, scope, className = 'statement-comment statement-value-comment' }: ValueCommentProps): React.JSX.Element | null {
	const { subject, card, predicate, version, draft, onDraftDone } = scope;
	const anchor = predicate !== undefined && view.anchor !== undefined ? { kind: 'value' as const, subject, predicate, anchor: view.anchor } : undefined;
	const asked = draft === index && anchor !== undefined;

	if (!view.comments && !asked) {
		return null;
	}

	return (
		<CommentField
			className={className}
			label="Comment on the value"
			lines={view.comments ?? []}
			target={anchor ? getCommentTarget(anchor) : undefined}
			subject={subject}
			card={card}
			version={version}
			autoFocus={asked}
			onLeave={asked ? onDraftDone : undefined}
		/>
	);
}

/**
 * Whether a value shows a comment: one it has, or one asked for.
 * @param view The value.
 * @param index The index of the value among the values of its row.
 * @param scope Where the comment is written.
 * @returns `true` where it does.
 */
export function hasValueComment(view: TermData, index: number, scope: CommentScope): boolean {
	return view.comments !== undefined || (scope.draft === index && view.anchor !== undefined);
}

import { DocumentSubject } from '../hooks/use-form-blocks';
import { getNewCommentTarget, NewCommentPosition } from '../state/comment-editor';
import { CommentField } from './comment-field';

/**
 * Properties of the {@link NewCommentBlock} component.
 */
export interface NewCommentBlockProps {
	/**
	 * Where the comment is added: before a run of the comments above a resource, directly above the
	 * resource, or at the end of the document when absent.
	 */
	position: NewCommentPosition;

	/**
	 * The document version the list belongs to.
	 */
	version: number;

	/**
	 * Called when the field is left, written or not.
	 */
	onDone: () => void;
}

/**
 * A comment of its own being added between the resources of the document or at its end: an empty
 * field with the focus, which writes the comment when it is left with text, a blank line apart
 * from what is around it, and goes when it is left.
 * @param props Where the comment is added.
 * @returns The block.
 */
export function NewCommentBlock({ position, version, onDone }: NewCommentBlockProps): React.JSX.Element {
	const subject = position?.subject ?? DocumentSubject;

	return (
		<div className="comment-block is-new">
			<CommentField className="comment-block-text" label="New comment" lines={[]} target={getNewCommentTarget(position)} subject={subject} card={subject} version={version} autoFocus onLeave={onDone} />
		</div>
	);
}

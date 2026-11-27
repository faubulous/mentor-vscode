import { CommentFormBlock } from '../state/form-block';
import { getCommentTarget } from '../state/comment-editor';
import { CommentField } from './comment-field';
import { CommentLine } from './comment-line';

/**
 * Properties of the {@link CommentBlock} component.
 */
export interface CommentBlockProps {
	/**
	 * The comment and where it is written.
	 */
	block: CommentFormBlock;

	/**
	 * The document version the comment belongs to.
	 */
	version: number;
}

/**
 * A comment written between the resources of the document, rendered from its Markdown, which can be
 * edited in place where the form can write the document.
 * @param props The comment.
 * @returns The block.
 */
export function CommentBlock({ block, version }: CommentBlockProps): React.JSX.Element {
	return (
		<CommentLine className="comment-block">
			<CommentField className="comment-block-text" label="Comment" lines={block.lines} target={getCommentTarget(block.anchor)} subject={block.subject} card={block.subject} version={version} />
		</CommentLine>
	);
}

import { CommentFormBlock } from '../state/form-block';
import { CommentField } from './comment-field';

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
 * A comment written between the resources of the document: grey text, as written, which can be
 * edited in place where the form can write the document.
 * @param props The comment.
 * @returns The block.
 */
export function CommentBlock({ block, version }: CommentBlockProps): React.JSX.Element {
	return (
		<div className="comment-block">
			<CommentField className="comment-block-text" label="Comment" lines={block.lines} anchor={block.anchor} subject={block.subject} card={block.subject} version={version} />
		</div>
	);
}

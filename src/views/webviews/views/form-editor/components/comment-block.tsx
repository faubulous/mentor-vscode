/**
 * Properties of the {@link CommentBlock} component.
 */
export interface CommentBlockProps {
	/**
	 * The text of the comment, one line per comment line of the document.
	 */
	text: string;
}

/**
 * A comment written between the resources of the document: grey text behind a bar along its
 * left edge, as written.
 * @param props The text.
 * @returns The block.
 */
export function CommentBlock({ text }: CommentBlockProps): React.JSX.Element {
	return (
		<div className="comment-block">
			<div className="comment-block-text">{text}</div>
		</div>
	);
}

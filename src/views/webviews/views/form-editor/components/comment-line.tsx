import { ReactNode } from 'react';

/**
 * Properties of the {@link CommentLine} component.
 */
export interface CommentLineProps {
	/**
	 * The class name that places the comment, besides its own.
	 */
	className?: string;

	/**
	 * The comment.
	 */
	children: ReactNode;
}

/**
 * A comment that stands on its own between cards, above a row or at the end of a card: a muted `#`
 * in the gutter where the grips of the rows stand, and the comment beside it, across the columns of
 * the rows.
 * @param props The comment.
 * @returns The line.
 */
export function CommentLine({ className, children }: CommentLineProps): React.JSX.Element {
	return (
		<div className={`comment-line${className ? ` ${className}` : ''}`}>
			<span className="comment-gutter" aria-hidden="true">#</span>
			<div className="comment-line-body">{children}</div>
		</div>
	);
}

import { ChangeEvent, KeyboardEvent } from 'react';
import { CommentAnchor } from '@src/services/editing/comment-anchor';
import { useCommentEditor } from '../hooks/use-comment-editor';
import { CommentEditorData } from '../state/comment-editor';
import { getEditProblemMessage } from './edit-problem-message';
import { AutoSizeTextarea } from './auto-size-textarea';
import { RowError } from './row-error';

/**
 * Properties of the {@link CommentField} component.
 */
export interface CommentFieldProps extends CommentEditorData {
	/**
	 * What the comment is written about, where the form knows it and can write the comment there.
	 */
	anchor?: CommentAnchor;

	/**
	 * The class name that gives the comment its look where it stands.
	 */
	className: string;

	/**
	 * The accessible name of the field.
	 */
	label: string;
}

/**
 * A comment of the document, written in place: where the form can write it, a text area as high as
 * the comment that looks like its text at rest, else its text. Each line of the field is a comment
 * line. Leaving the field writes what was typed, an empty field removing the comment; Ctrl+Enter
 * leaves it too, Enter breaks the line, and Escape gives up what was typed.
 * @param props The comment and where it stands.
 * @returns The comment.
 */
export function CommentField({ anchor, className, label, ...data }: CommentFieldProps): React.JSX.Element {
	const { editor, state } = useCommentEditor(anchor, data);

	if (!editor || !state) {
		return <span className={className}>{data.lines.join('\n')}</span>;
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
		if (event.nativeEvent.isComposing) {
			return;
		}

		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			event.stopPropagation();
			event.currentTarget.blur();
		} else if (event.key === 'Enter') {
			// Enter breaks the line of the comment, and does not write the row it stands in.
			event.stopPropagation();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			editor.revert();
			event.currentTarget.blur();
		}
	};

	return (
		<span className={`${className} comment-field`}>
			<AutoSizeTextarea
				value={state.text}
				placeholder="Comment"
				aria-label={label}
				onChange={(event: ChangeEvent<HTMLTextAreaElement>) => editor.input(event.currentTarget.value)}
				onKeyDown={handleKeyDown}
				onBlur={() => editor.leave()}
			/>
			{state.rejection && <RowError message={getEditProblemMessage(state.rejection)} onDismiss={() => editor.dismissRejection()} />}
		</span>
	);
}

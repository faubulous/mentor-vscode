import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { getCommentLineText } from '@src/services/resource/comment-lines';
import { useCommentEditor } from '../hooks/use-comment-editor';
import { CommentEditorData, CommentTarget } from '../state/comment-editor';
import { getEditProblemMessage } from './edit-problem-message';
import { AutoSizeTextarea } from './auto-size-textarea';
import { RowError } from './row-error';

/**
 * Properties of the {@link CommentField} component.
 */
export interface CommentFieldProps extends CommentEditorData {
	/**
	 * The comment and the edit that writes it, where the form knows it and can write it.
	 */
	target?: CommentTarget;

	/**
	 * The class name that gives the comment its look where it stands.
	 */
	className: string;

	/**
	 * The accessible name of the field.
	 */
	label: string;

	/**
	 * Whether the comment opens for editing, with the focus, when it appears, as a comment just
	 * asked for does.
	 */
	autoFocus?: boolean;

	/**
	 * Called when the focus leaves the text of the comment, after what was typed is handed over to
	 * be written.
	 */
	onLeave?: () => void;
}

/**
 * A comment of the document, as the cells of Markdown in a notebook show their text: rendered as
 * text without the `#` signs that start its lines, and where the form can write the document, open
 * for editing on a double click or Enter, as a text area with the lines as they are written after
 * the `#` that starts each. Leaving the text writes what was typed and renders the comment again,
 * an empty text removing it; Ctrl+Enter does so too, Enter breaks the line, and Escape gives up
 * what was typed. After Ctrl+Enter and Escape the rendered comment keeps the focus.
 * @param props The comment and where it stands.
 * @returns The comment.
 */
export function CommentField({ target, className, label, autoFocus = false, onLeave, ...data }: CommentFieldProps): React.JSX.Element {
	const { editor, state } = useCommentEditor(target, data);
	const [editing, setEditing] = useState(autoFocus);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const renderedRef = useRef<HTMLSpanElement>(null);
	const keepFocus = useRef(false);

	// A comment asked for while it is shown opens for editing too.
	useEffect(() => {
		if (autoFocus) {
			setEditing(true);
		}
	}, [autoFocus]);

	// The text takes the focus as it opens, with the caret after it; the rendered comment takes it
	// back where a key closed the text.
	useEffect(() => {
		const input = inputRef.current;

		if (editing && input) {
			input.focus();
			input.setSelectionRange(input.value.length, input.value.length);
		} else if (!editing && keepFocus.current) {
			keepFocus.current = false;
			renderedRef.current?.focus();
		}
	}, [editing]);

	const text = _renderedTextOf(state?.text ?? data.lines.join('\n'));

	if (!editor || !state) {
		return <span className={className}>{text}</span>;
	}

	const rejection = state.rejection && <RowError message={getEditProblemMessage(state.rejection)} onDismiss={() => editor.dismissRejection()} />;

	if (!editing) {
		const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
			if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
				event.preventDefault();
				event.stopPropagation();
				setEditing(true);
			}
		};

		return (
			<span className={`${className} comment-field is-rendered`}>
				<span ref={renderedRef} className="comment-field-text" role="button" tabIndex={0} aria-label={label} title="Double-click or press Enter to edit" onDoubleClick={() => setEditing(true)} onKeyDown={handleKeyDown}>
					{text}
				</span>
				{rejection}
			</span>
		);
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
		if (event.nativeEvent.isComposing) {
			return;
		}

		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			event.stopPropagation();
			keepFocus.current = true;
			event.currentTarget.blur();
		} else if (event.key === 'Enter') {
			// Enter breaks the line of the comment, and does not write the row it stands in.
			event.stopPropagation();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			editor.revert();
			keepFocus.current = true;
			event.currentTarget.blur();
		}
	};

	const handleBlur = (): void => {
		editor.leave();
		setEditing(false);
		onLeave?.();
	};

	return (
		<span className={`${className} comment-field is-editing`}>
			<AutoSizeTextarea
				inputRef={inputRef}
				value={state.text}
				placeholder="Comment"
				aria-label={label}
				onChange={(event: ChangeEvent<HTMLTextAreaElement>) => editor.input(event.currentTarget.value)}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
			/>
			{rejection}
		</span>
	);
}

/**
 * The text of a comment as it is rendered: its lines without the `#` signs and the one space that
 * start them.
 * @param lines The lines as they are written after the `#` that starts each, joined by line breaks.
 * @returns The text.
 */
function _renderedTextOf(lines: string): string {
	return lines.split('\n').map(getCommentLineText).join('\n');
}

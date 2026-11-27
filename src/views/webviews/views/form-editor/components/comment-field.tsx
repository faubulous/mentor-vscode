import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useCommentEditor } from '../hooks/use-comment-editor';
import { CommentEditorData, CommentTarget } from '../state/comment-editor';
import { getEditProblemMessage } from './edit-problem-message';
import { AutoSizeTextarea } from './auto-size-textarea';
import { CommentMarkdown } from './comment-markdown';
import { RowError } from './row-error';

/**
 * What the accessible name of a comment being edited adds to the name of the comment: how its text
 * is written and the keys that render it.
 */
const EDITING_HINT = 'Markdown. Ctrl or Cmd plus Enter, or Esc, to render.';

/**
 * The accessible name of a comment being edited: the name of the comment, how its text is written
 * and the keys that render it.
 * @param label The accessible name of the comment.
 * @returns The name.
 */
export function getCommentEditingLabel(label: string): string {
	return `${label}, ${EDITING_HINT}`;
}

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
	 * The accessible name of the comment.
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
 * A comment of the document, as the cells of Markdown in a notebook show their text: rendered from
 * its Markdown, and where the form can write the document, opened for editing by a double click or Enter, as a text area with
 * its Markdown text. Ctrl+Enter, Escape and leaving the text write what was typed and render the
 * comment again, an empty text removing it; Enter breaks the line. After Ctrl+Enter and Escape the
 * rendered comment keeps the focus.
 * @param props The comment and where it stands.
 * @returns The comment.
 */
export function CommentField({ target, className, label, autoFocus = false, onLeave, ...data }: CommentFieldProps): React.JSX.Element {
	const { editor, state } = useCommentEditor(target, data);
	const [editing, setEditing] = useState(autoFocus);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const renderedRef = useRef<HTMLDivElement>(null);
	const keepFocus = useRef(false);
	const text = state?.text ?? data.lines.join('\n');

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

	if (!editor || !state) {
		return <div className={`${className} comment-field is-rendered`}><RenderedComment text={text} /></div>;
	}

	const rejection = state.rejection && <RowError message={getEditProblemMessage(state.rejection)} onDismiss={() => editor.dismissRejection()} />;

	if (!editing) {
		const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
			if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
				event.preventDefault();
				event.stopPropagation();
				setEditing(true);
			}
		};

		return (
			<div className={`${className} comment-field is-rendered`}>
				<RenderedComment text={text} bodyRef={renderedRef} label={label} onOpen={() => setEditing(true)} onKeyDown={handleKeyDown} />
				{rejection}
			</div>
		);
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
		if (event.nativeEvent.isComposing) {
			return;
		}

		if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
			event.preventDefault();
			event.stopPropagation();
			keepFocus.current = true;
			event.currentTarget.blur();
		} else if (event.key === 'Enter') {
			// Enter breaks the line of the comment, and does not write the row it stands in.
			event.stopPropagation();
		}
	};

	const handleBlur = (): void => {
		editor.leave();
		setEditing(false);
		onLeave?.();
	};

	return (
		<div className={`${className} comment-field is-editing`}>
			<AutoSizeTextarea
				className="comment-input"
				inputRef={inputRef}
				value={state.text}
				placeholder="Comment"
				aria-label={getCommentEditingLabel(label)}
				onChange={(event: ChangeEvent<HTMLTextAreaElement>) => editor.input(event.currentTarget.value)}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
			>
				<span className="comment-type" aria-hidden="true">markdown</span>
			</AutoSizeTextarea>
			{rejection}
		</div>
	);
}

/**
 * Properties of the {@link RenderedComment} component.
 */
interface RenderedCommentProps {
	/**
	 * The Markdown text of the comment.
	 */
	text: string;

	/**
	 * Holds the rendered text, which takes the focus back after editing.
	 */
	bodyRef?: React.Ref<HTMLDivElement>;

	/**
	 * The accessible name of the comment, where it opens for editing.
	 */
	label?: string;

	/**
	 * Opens the comment for editing, where it can be.
	 */
	onOpen?: () => void;

	/**
	 * Handles the keys pressed on the rendered text, where it opens for editing.
	 */
	onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * A comment rendered from its Markdown, shown whole.
 * @param props The comment and how it opens for editing.
 * @returns The comment.
 */
function RenderedComment({ text, bodyRef, label, onOpen, onKeyDown }: RenderedCommentProps): React.JSX.Element {
	const editable = onOpen !== undefined;

	return (
		<div
			ref={bodyRef}
			className="comment-body"
			role={editable ? 'button' : undefined}
			tabIndex={editable ? 0 : undefined}
			aria-label={editable ? label : undefined}
			title={editable ? 'Double-click or press Enter to edit' : undefined}
			onDoubleClick={onOpen}
			onKeyDown={onKeyDown}
		>
			<CommentMarkdown text={text} />
		</div>
	);
}

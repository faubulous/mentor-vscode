import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useFormEditorContext } from '../state/form-editor-context';
import { CommentEditor, CommentEditorData, CommentEditorState, CommentTarget } from '../state/comment-editor';

/**
 * The editor of a comment and what its field shows.
 */
export interface CommentEditing {
	/**
	 * The editor, where the comment can be written.
	 */
	editor?: CommentEditor;

	/**
	 * What the field shows, where the comment can be written.
	 */
	state?: CommentEditorState;
}

/**
 * The editor of a comment, where the form can write the document and the comment has a target.
 * It lives as long as the target names the same comment, takes in the comment as the document
 * writes it on every render, and is retired when the comment is no longer shown.
 * @param target The comment and the edit that writes it, if the form can write it.
 * @param data The comment as the document writes it.
 * @returns The editor and its state, or nothing where the comment only reads.
 */
export function useCommentEditor(target: CommentTarget | undefined, data: CommentEditorData): CommentEditing {
	const { editing, readOnly } = useFormEditorContext();
	const key = target?.key;

	// The editor is kept by the comment its target names, not by the data, which every render renews.
	const editor = useMemo(
		() => editing && !readOnly && target ? new CommentEditor(editing, target, data) : undefined,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[editing, readOnly, key]
	);

	editor?.deliver(data);

	useEffect(() => () => editor?.retire(), [editor]);

	const subscribe = useCallback((listener: () => void) => editor?.subscribe(listener) ?? (() => undefined), [editor]);
	const state = useSyncExternalStore(subscribe, () => editor?.state);

	return { editor, state };
}

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { termToString } from 'rdf-string';
import { CommentAnchor } from '@src/services/editing/comment-anchor';
import { useFormEditorContext } from '../state/form-editor-context';
import { CommentEditor, CommentEditorData, CommentEditorState } from '../state/comment-editor';

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
 * The editor of a comment, where the form can write the document and the comment has an anchor.
 * It lives as long as the anchor names the same comment, takes in the comment as the document
 * writes it on every render, and is retired when the comment is no longer shown.
 * @param anchor What the comment is written about, if the form knows it.
 * @param data The comment as the document writes it.
 * @returns The editor and its state, or nothing where the comment only reads.
 */
export function useCommentEditor(anchor: CommentAnchor | undefined, data: CommentEditorData): CommentEditing {
	const { editing, readOnly } = useFormEditorContext();
	const key = anchor ? getCommentAnchorKey(anchor) : undefined;

	// The editor is kept by the comment its anchor names, not by the data, which every render renews.
	const editor = useMemo(
		() => editing && !readOnly && anchor ? new CommentEditor(editing, anchor, data) : undefined,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[editing, readOnly, key]
	);

	editor?.deliver(data);

	useEffect(() => () => editor?.retire(), [editor]);

	const subscribe = useCallback((listener: () => void) => editor?.subscribe(listener) ?? (() => undefined), [editor]);
	const state = useSyncExternalStore(subscribe, () => editor?.state);

	return { editor, state };
}

/**
 * The key of the comment an anchor names.
 * @param anchor The anchor.
 * @returns The key.
 */
export function getCommentAnchorKey(anchor: CommentAnchor): string {
	switch (anchor.kind) {
		case 'resource':
			return `resource ${termToString(anchor.subject)} ${anchor.run}`;
		case 'node':
			return `node ${termToString(anchor.subject)}`;
		case 'property':
			return `property ${termToString(anchor.subject)} ${anchor.predicate}`;
		case 'value':
			return `value ${termToString(anchor.subject)} ${anchor.predicate} ${anchor.anchor}`;
		default:
			return `document ${anchor.run}`;
	}
}

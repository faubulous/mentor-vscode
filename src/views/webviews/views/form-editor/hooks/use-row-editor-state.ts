import { useCallback, useSyncExternalStore } from 'react';
import { StatementRowEditor } from '../state/statement-row-editor';
import { StatementRowState } from '../state/statement-row-state';

/**
 * Follow the state of a row that is edited: re-render on every change of its editor.
 * @param editor The editor of the row, or none for a row that only reads.
 * @returns The state of the row, or `undefined` for a row that only reads.
 */
export function useRowEditorState(editor: StatementRowEditor | undefined): StatementRowState | undefined {
	const subscribe = useCallback((listener: () => void) => editor?.subscribe(listener) ?? (() => undefined), [editor]);

	return useSyncExternalStore(subscribe, () => editor?.state);
}

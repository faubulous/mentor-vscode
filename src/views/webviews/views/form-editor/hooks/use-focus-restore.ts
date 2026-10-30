import { useLayoutEffect } from 'react';
import { CellKey } from '../state/cell-key';

/**
 * The elements of a row that take the focus, in the order the focus prefers them.
 */
const FOCUSABLE = 'vscode-textfield, vscode-textarea, button, [tabindex="0"]';

/**
 * Move the focus to a row once it exists: into the field of the value the request names, else
 * into the first field of the row. Rows re-render from new data after every edit, so the row is
 * found by its key rather than by a reference, and the attempt is repeated on every render until
 * the row appears.
 * @param root The element holding the rows.
 * @param request The row to focus, or `undefined` when there is nothing to restore.
 * @param onFulfilled Called once the focus has moved.
 */
export function useFocusRestore(root: HTMLElement | null, request: CellKey | undefined, onFulfilled: () => void): void {
	useLayoutEffect(() => {
		if (!root || !request) {
			return;
		}

		const row = root.querySelector<HTMLElement>(`[data-cell="${CSS.escape(request.row().toString())}"]`);

		if (!row) {
			return;
		}

		const value = request.valueIndex === undefined ? null : row.querySelector<HTMLElement>(`[data-value-index="${request.valueIndex}"]`);
		const target = (value?.matches(FOCUSABLE) ? value : value?.querySelector<HTMLElement>(FOCUSABLE)) ?? row.querySelector<HTMLElement>(FOCUSABLE) ?? row;

		target.focus({ preventScroll: true });
		target.scrollIntoView?.({ block: 'nearest' });
		onFulfilled();
	});
}

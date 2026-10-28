import { useLayoutEffect } from 'react';
import { CellKey } from '../state/cell-key';

/**
 * Move the focus to a cell once it exists. Rows re-render from new data after every edit, so the
 * cell is found by its key rather than by a reference, and the attempt is repeated on every
 * render until the cell appears. A row of fields places the caret itself when it takes the focus.
 * @param root The element holding the cells.
 * @param request The cell to focus, or `undefined` when there is nothing to restore.
 * @param onFulfilled Called once the focus has moved.
 */
export function useFocusRestore(root: HTMLElement | null, request: CellKey | undefined, onFulfilled: () => void): void {
	useLayoutEffect(() => {
		if (!root || !request) {
			return;
		}

		const cell = root.querySelector<HTMLElement>(`[data-cell="${request.toString().replace(/["\\]/g, '\\$&')}"]`);

		if (!cell) {
			return;
		}

		cell.focus({ preventScroll: true });
		cell.scrollIntoView?.({ block: 'nearest' });
		onFulfilled();
	});
}

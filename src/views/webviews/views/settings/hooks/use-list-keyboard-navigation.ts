import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

/**
 * Props that drive a single list item's keyboard behavior. Apply the individual
 * fields to the item's focusable root element.
 */
export interface ListItemNavProps {
	/**
	 * Tab order of the item. Every item is a tab stop.
	 */
	tabIndex: number;

	/**
	 * Whether this item is the active (selected) item.
	 */
	selected: boolean;

	/**
	 * Registers the item's root element so the hook can move focus to it.
	 */
	ref: (element: HTMLElement | null) => void;

	/**
	 * Keyboard handler implementing Arrow/Home/End navigation and Enter/Space activation.
	 */
	onKeyDown: (event: React.KeyboardEvent) => void;

	/**
	 * Marks the item active when it receives focus.
	 */
	onFocus: () => void;
}

interface ListKeyboardNavigationOptions {
	/**
	 * Called when an item is activated via Enter or Space.
	 */
	onActivate?: (id: string) => void;
}

/**
 * Adds keyboard navigation and a selection state to a flat, ordered list of item
 * ids. Every item is a tab stop, so Tab moves through the rows; ArrowUp/ArrowDown
 * and Home/End additionally move focus between them and Enter/Space activate the
 * focused item. The ids may span several DOM containers — navigation follows their
 * order in the array.
 *
 * No item is marked as selected until the user focuses one, so the list does not
 * render a pre-selected row on first paint.
 *
 * @param ids The item ids in visual (top-to-bottom) order.
 * @param options Optional activation handler.
 * @returns `getItemProps(id)` yielding the per-item navigation props.
 */
export function useListKeyboardNavigation(ids: string[], options: ListKeyboardNavigationOptions = {}) {
	const { onActivate } = options;
	const [activeId, setActiveId] = useState<string | null>(null);
	const refs = useRef(new Map<string, HTMLElement>());
	const idsKey = ids.join('|');

	// Drop the active id if its item is no longer present.
	useEffect(() => {
		if (activeId !== null && !ids.includes(activeId)) {
			setActiveId(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [idsKey]);

	const focusItem = (id: string | undefined) => {
		if (id === undefined) {
			return;
		}

		setActiveId(id);
		refs.current.get(id)?.focus();
	};

	const getItemProps = (id: string): ListItemNavProps => ({
		tabIndex: 0,
		selected: activeId === id,
		ref: (element) => {
			if (element) {
				refs.current.set(id, element);
			} else {
				refs.current.delete(id);
			}
		},
		onFocus: () => setActiveId(id),
		onKeyDown: (event) => {
			// Ignore events bubbling up from inner controls (action buttons, selects).
			if (event.target !== event.currentTarget) {
				return;
			}

			const index = ids.indexOf(id);

			switch (event.key) {
				case 'ArrowDown':
					event.preventDefault();
					focusItem(ids[Math.min(index + 1, ids.length - 1)]);
					break;
				case 'ArrowUp':
					event.preventDefault();
					focusItem(ids[Math.max(index - 1, 0)]);
					break;
				case 'Home':
					event.preventDefault();
					focusItem(ids[0]);
					break;
				case 'End':
					event.preventDefault();
					focusItem(ids[ids.length - 1]);
					break;
				case 'Enter':
				case ' ':
					event.preventDefault();
					onActivate?.(id);
					break;
			}
		},
	});

	return { activeId, getItemProps };
}

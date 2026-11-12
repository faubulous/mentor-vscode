import { MouseEvent, MutableRefObject, useCallback, useRef } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';

/**
 * The elements that keep the menu of the browser on a right-click: text fields, comboboxes and
 * editable text.
 */
const TEXT_FIELD_SELECTOR = 'vscode-textfield, vscode-textarea, vscode-single-select, input, textarea, [contenteditable="true"]';

/**
 * The menu of a ⋮ button that a right-click opens as well.
 */
export interface ContextMenu {
	/**
	 * Holds the menu element, which the ⋮ button toggles.
	 */
	menuRef: MutableRefObject<VscodeContextMenu | null>;

	/**
	 * Open the menu on a right-click, unless the menu is not there or the click is in a text field;
	 * the event then goes on to the menu of what holds the element.
	 * @param event The right-click.
	 */
	openOnContextMenu: (event: MouseEvent<Element>) => void;
}

/**
 * Let a right-click open the menu of the ⋮ button of what is under the pointer: the innermost
 * element with a menu takes the click, so a nested card goes before its row and a row before its
 * card.
 * @returns The ref of the menu and the handler of the right-click.
 */
export function useContextMenu(): ContextMenu {
	const menuRef = useRef<VscodeContextMenu | null>(null);

	const openOnContextMenu = useCallback((event: MouseEvent<Element>): void => {
		if (!menuRef.current || (event.target instanceof Element && event.target.closest(TEXT_FIELD_SELECTOR))) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		menuRef.current.show = true;
	}, []);

	return { menuRef, openOnContextMenu };
}

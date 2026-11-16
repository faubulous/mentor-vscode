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
	 * Open the menu at the pointer on a right-click, unless the menu is not there or the click is
	 * in a text field; the event then goes on to the menu of what holds the element.
	 * @param event The right-click.
	 */
	openOnContextMenu: (event: MouseEvent<Element>) => void;
}

/**
 * Let a right-click open the menu of the ⋮ button of what is under the pointer, at the pointer: the
 * innermost element with a menu takes the click, so a nested card goes before its row and a row
 * before its card.
 * @returns The ref of the menu and the handler of the right-click.
 */
export function useContextMenu(): ContextMenu {
	const menuRef = useRef<VscodeContextMenu | null>(null);

	const openOnContextMenu = useCallback((event: MouseEvent<Element>): void => {
		const menu = menuRef.current;

		if (!menu || (event.target instanceof Element && event.target.closest(TEXT_FIELD_SELECTOR))) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		_placeAt(menu, event.clientX, event.clientY);
		menu.show = true;

		void menu.updateComplete.then(() => _keepInView(menu));
	}, []);

	return { menuRef, openOnContextMenu };
}

/**
 * Open the menu under its ⋮ button, or close it, which a click on the button does; a menu that a
 * right-click placed at the pointer goes back under the button.
 * @param menu The menu element, if it is there.
 */
export function toggleMenuAtButton(menu: VscodeContextMenu | null): void {
	if (!menu) {
		return;
	}

	menu.style.removeProperty('left');
	menu.style.removeProperty('top');
	menu.style.removeProperty('right');
	menu.show = !menu.show;
}

/**
 * Place the menu with its top left corner at a point of the viewport, in the coordinates of the
 * element it is laid out in.
 * @param menu The menu element.
 * @param x The horizontal position in the viewport.
 * @param y The vertical position in the viewport.
 */
function _placeAt(menu: VscodeContextMenu, x: number, y: number): void {
	const container = (menu.offsetParent ?? menu.parentElement)?.getBoundingClientRect();

	menu.style.left = `${x - (container?.left ?? 0)}px`;
	menu.style.top = `${y - (container?.top ?? 0)}px`;
	menu.style.right = 'auto';
}

/**
 * Move an open menu that runs past the right or the bottom edge of the viewport back into it: to
 * the left of the pointer, and above it.
 * @param menu The menu element.
 */
function _keepInView(menu: VscodeContextMenu): void {
	const bounds = menu.getBoundingClientRect();
	const overflowRight = bounds.right - document.documentElement.clientWidth;
	const overflowBottom = bounds.bottom - document.documentElement.clientHeight;

	if (overflowRight > 0) {
		menu.style.left = `${menu.offsetLeft - Math.min(bounds.width, bounds.left)}px`;
	}

	if (overflowBottom > 0) {
		menu.style.top = `${menu.offsetTop - Math.min(bounds.height, bounds.top)}px`;
	}
}

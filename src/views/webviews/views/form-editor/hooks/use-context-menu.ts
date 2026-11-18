import { MouseEvent, MutableRefObject, useCallback, useEffect, useRef } from 'react';
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
 * before its card. Only one menu is open at a time: a right-click outside the menu closes it, as a
 * click outside it does, before another menu opens.
 * @returns The ref of the menu and the handler of the right-click.
 */
export function useContextMenu(): ContextMenu {
	const menuRef = useRef<VscodeContextMenu | null>(null);

	// The menu closes itself on a click outside it, but a right-click is no click; the listener
	// runs before the right-click reaches the element that opens a menu.
	useEffect(() => {
		const closeOnContextMenu = (event: Event): void => {
			const menu = menuRef.current;

			if (menu?.show && !event.composedPath().includes(menu)) {
				_close(menu);
			}
		};

		document.addEventListener('contextmenu', closeOnContextMenu, { capture: true });

		return () => document.removeEventListener('contextmenu', closeOnContextMenu, { capture: true });
	}, []);

	const openOnContextMenu = useCallback((event: MouseEvent<Element>): void => {
		const menu = menuRef.current;

		if (!menu || (event.target instanceof Element && event.target.closest(TEXT_FIELD_SELECTOR))) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		_placeAt(menu, event.clientX, event.clientY);
		_openInTopLayer(menu);
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
	menu.style.removeProperty('position-try-fallbacks');
	_openInTopLayer(menu);
	menu.show = !menu.show;
}

/**
 * Put the menu into the top layer of the page as a popover, so nothing laid out over its place
 * covers it. It stays there once opened: a closed menu draws nothing, and it leaves the top layer
 * with the element.
 * @param menu The menu element.
 */
function _openInTopLayer(menu: VscodeContextMenu): void {
	if (typeof menu.showPopover !== 'function') {
		return;
	}

	if (!menu.hasAttribute('popover')) {
		menu.setAttribute('popover', 'manual');
	}

	if (!menu.matches(':popover-open')) {
		menu.showPopover();
	}
}

/**
 * Close an open menu as Escape does, which also stops it from waiting for a click outside it: a
 * menu closed by only hiding it would still close itself on that click, even when its ⋮ button
 * opens it again by the click.
 * @param menu The menu element.
 */
function _close(menu: VscodeContextMenu): void {
	menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
}

/**
 * Place the menu with its top left corner at a point of the viewport, which the menu is laid out
 * in as a popover; it is kept in view by {@link _keepInView}, not by flipping it over its button.
 * @param menu The menu element.
 * @param x The horizontal position in the viewport.
 * @param y The vertical position in the viewport.
 */
function _placeAt(menu: VscodeContextMenu, x: number, y: number): void {
	menu.style.left = `${x}px`;
	menu.style.top = `${y}px`;
	menu.style.right = 'auto';
	menu.style.setProperty('position-try-fallbacks', 'none');
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
		menu.style.left = `${bounds.left - Math.min(bounds.width, bounds.left)}px`;
	}

	if (overflowBottom > 0) {
		menu.style.top = `${bounds.top - Math.min(bounds.height, bounds.top)}px`;
	}
}

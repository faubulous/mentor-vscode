import { useRef } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { RemoveShortcut } from '../services/remove-shortcut';

/**
 * What the ⋮ menu of a card does; an action that is absent is left out of the menu.
 */
export interface ResourceCardActions {
	/**
	 * Show the resource in a text editor beside the form.
	 */
	onReveal?: () => void;

	/**
	 * Remove the resource with all its statements from the document.
	 */
	onRemove?: () => void;
}

/**
 * Properties of the {@link ResourceCardMenu} component.
 */
export interface ResourceCardMenuProps {
	/**
	 * What the menu offers.
	 */
	actions: ResourceCardActions;
}

/**
 * The ⋮ button of the title bar of a card and its menu: Reveal in editor, and Remove after a
 * separator. The menu hides itself when an item is picked or the user clicks away. Without an
 * action the button is left out.
 * @param props What the menu offers.
 * @returns The button and the menu, or nothing.
 */
export function ResourceCardMenu({ actions }: ResourceCardMenuProps): React.JSX.Element | null {
	const menuRef = useRef<VscodeContextMenu | null>(null);
	const selectRef = useVscodeElementRef<VscodeContextMenu, { value: string }>('vsc-context-menu-select', (_element, event) => {
		if (event.detail.value === 'reveal') {
			actions.onReveal?.();
		} else if (event.detail.value === 'remove') {
			actions.onRemove?.();
		}
	});

	const items = [
		...(actions.onReveal ? [{ label: 'Reveal in Editor', value: 'reveal' }] : []),
		...(actions.onReveal && actions.onRemove ? [{ separator: true }] : []),
		...(actions.onRemove ? [{ label: 'Remove', value: 'remove', keybinding: RemoveShortcut.label }] : [])
	];

	if (items.length === 0) {
		return null;
	}

	const setMenuRef = (element: VscodeContextMenu | null): void => {
		menuRef.current = element;
		selectRef(element);
	};

	const toggle = (): void => {
		if (menuRef.current) {
			menuRef.current.show = !menuRef.current.show;
		}
	};

	return (
		<span className="resource-card-menu">
			<button type="button" className="icon-button" aria-label="More actions" aria-haspopup="menu" title="More actions" onClick={toggle}>
				<vscode-icon name="kebab-vertical" size={14}></vscode-icon>
			</button>
			<vscode-context-menu ref={setMenuRef} data={items}></vscode-context-menu>
		</span>
	);
}

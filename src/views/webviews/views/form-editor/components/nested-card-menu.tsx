import { MutableRefObject } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { FormEditorShortcuts } from '../form-editor-shortcuts';
import { toggleMenuAtButton } from '../hooks/use-context-menu';

/**
 * What the row holding the nested card of a blank node can do with the node.
 */
export interface NestedCardActions {
	/**
	 * Write a copy of the node after it.
	 */
	onDuplicate: () => void;

	/**
	 * Remove the node from its row and write the row.
	 */
	onRemove: () => void;
}

/**
 * Properties of the {@link NestedCardMenu} component.
 */
export interface NestedCardMenuProps {
	/**
	 * What the menu offers.
	 */
	actions: NestedCardActions;

	/**
	 * Holds the menu element, which the card opens on a right-click as well.
	 */
	menuRef: MutableRefObject<VscodeContextMenu | null>;
}

/**
 * The ⋮ button of the nested card of a blank node and its menu: Duplicate and Remove. The menu hides itself when an item is picked or the user clicks away, so its visibility
 * is left to the element.
 * @param props What the menu offers and where its element is kept.
 * @returns The button and the menu.
 */
export function NestedCardMenu({ actions, menuRef }: NestedCardMenuProps): React.JSX.Element {
	const selectRef = useVscodeElementRef<VscodeContextMenu, { value: string }>('vsc-context-menu-select', (_element, event) => {
		switch (event.detail.value) {
			case 'duplicate':
				actions.onDuplicate();
				break;
			case 'remove':
				actions.onRemove();
				break;
			default:
				break;
		}
	});

	const setMenuRef = (element: VscodeContextMenu | null): void => {
		menuRef.current = element;
		selectRef(element);
	};

	return (
		<span className="nested-card-menu">
			<button type="button" className="nested-card-more" aria-label="More actions" aria-haspopup="menu" title="More actions" onClick={() => toggleMenuAtButton(menuRef.current)}>
				<vscode-icon name="kebab-vertical" size={14}></vscode-icon>
			</button>
			<vscode-context-menu
				ref={setMenuRef}
				data={[
					{ label: 'Duplicate', value: 'duplicate' },
					{ separator: true },
					{ label: 'Remove', value: 'remove', keybinding: FormEditorShortcuts.Remove.label }
				]}
			></vscode-context-menu>
		</span>
	);
}

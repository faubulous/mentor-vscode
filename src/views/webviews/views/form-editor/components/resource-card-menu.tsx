import { MutableRefObject } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { FormEditorShortcuts } from '../form-editor-shortcuts';
import { toggleMenuAtButton } from '../hooks/use-context-menu';

/**
 * The state of the card the ⋮ menu of a card shows and what its items do; an action that is absent
 * is left out of the menu.
 */
export interface ResourceCardMenuState {
	/**
	 * Whether the card is expanded, which names the item that toggles it.
	 */
	expanded: boolean;

	/**
	 * The prefixed name of the resource, which Copy IRI shows beside it.
	 */
	prefixedName?: string;

	/**
	 * Expand the card, or collapse it again.
	 */
	onToggle: () => void;

	/**
	 * Show the resource in a text editor beside the form.
	 */
	onReveal?: () => void;

	/**
	 * Put the IRI of the resource on the clipboard; absent for a blank node.
	 */
	onCopyIri?: () => void;

	/**
	 * Unpin every property pinned for the resource in a scope that can be written.
	 */
	onUnpinAll?: () => void;

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
	 * The state of the card and what the menu offers.
	 */
	state: ResourceCardMenuState;

	/**
	 * Holds the menu element, which a right-click on the card opens as well.
	 */
	menuRef: MutableRefObject<VscodeContextMenu | null>;
}

/**
 * An item of the menu.
 */
type MenuItem = { label?: string; value?: string; keybinding?: string; separator?: boolean };

/**
 * The ⋮ button of the title bar of a card and its menu: Collapse or Expand; Reveal in Editor and
 * Copy IRI; Unpin All; and Remove, each group after a separator. The menu hides itself when an
 * item is picked or the user clicks away; a right-click on the card opens it too.
 * @param props The state of the card, what the menu offers and where its element is kept.
 * @returns The button and the menu.
 */
export function ResourceCardMenu({ state, menuRef }: ResourceCardMenuProps): React.JSX.Element {
	const selectRef = useVscodeElementRef<VscodeContextMenu, { value: string }>('vsc-context-menu-select', (_element, event) => {
		switch (event.detail.value) {
			case 'toggle':
				state.onToggle();
				break;
			case 'reveal':
				state.onReveal?.();
				break;
			case 'copy-iri':
				state.onCopyIri?.();
				break;
			case 'unpin-all':
				state.onUnpinAll?.();
				break;
			case 'remove':
				state.onRemove?.();
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
		<span className="resource-card-menu">
			<button type="button" className="icon-button" aria-label="More actions" aria-haspopup="menu" title="More actions" onClick={() => toggleMenuAtButton(menuRef.current)}>
				<vscode-icon name="kebab-vertical" size={14}></vscode-icon>
			</button>
			<vscode-context-menu ref={setMenuRef} data={_itemsOf(state)}></vscode-context-menu>
		</span>
	);
}

/**
 * The items of the menu of a card, in groups divided by separators, leaving out the absent actions
 * and the empty groups.
 * @param state The state of the card and what the menu offers.
 * @returns The items.
 */
function _itemsOf(state: ResourceCardMenuState): MenuItem[] {
	const groups: MenuItem[][] = [
		[{ label: state.expanded ? 'Collapse' : 'Expand', value: 'toggle' }],
		[
			...(state.onReveal ? [{ label: 'Reveal in Editor', value: 'reveal' }] : []),
			...(state.onCopyIri ? [{ label: 'Copy IRI', value: 'copy-iri', keybinding: state.prefixedName }] : [])
		],
		state.onUnpinAll ? [{ label: 'Unpin All', value: 'unpin-all' }] : [],
		state.onRemove ? [{ label: 'Remove', value: 'remove', keybinding: FormEditorShortcuts.Remove.label }] : []
	];

	return groups.filter(group => group.length > 0).flatMap((group, index) => index > 0 ? [{ separator: true }, ...group] : group);
}

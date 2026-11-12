import { MutableRefObject } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { ScopeKey } from '@src/utilities/config-scope';
import { FormEditorShortcuts } from '../form-editor-shortcuts';

/**
 * Properties of the {@link RowMenu} component.
 */
export interface RowMenuProps {
	/**
	 * The label of the property of the row, which the button is named after.
	 */
	label: string;

	/**
	 * Who the property is pinned for, or `undefined` while it is not pinned.
	 */
	scope?: ScopeKey;

	/**
	 * The settings the property can be pinned in, in the order the menu offers them.
	 */
	pinScopes: readonly ScopeKey[];

	/**
	 * Pin the property in a scope, or unpin it; absent where the property cannot be pinned.
	 * @param scope Who to pin it for, or `undefined` to unpin it.
	 */
	onPin?: (scope: ScopeKey | undefined) => void;

	/**
	 * Remove the row: the property with all its values; absent where the row cannot be written.
	 */
	onRemove?: () => void;

	/**
	 * Holds the menu element, which a right-click on the row opens as well.
	 */
	menuRef: MutableRefObject<VscodeContextMenu | null>;
}

/**
 * The label of the item of the menu for each scope a property can be pinned in.
 */
const PIN_SCOPE_LABELS: Readonly<Record<ScopeKey, string>> = {
	user: 'Pin for me',
	workspace: 'Pin for everyone'
};

/**
 * The ⋮ menu of a row, shown while the pointer or the focus is in the row: what the pin of the
 * property can become, an item for each other scope it can be pinned in and Unpin while it is
 * pinned, then Remove, which removes the property with all its values. A pinned property shows
 * a pin before the button at all times: outline for oneself, filled for everyone. The menu hides
 * itself when an item is picked or the user clicks away; a right-click on the row opens it too.
 * Without an item the menu is left out.
 * @param props The row and what its menu does.
 * @returns The menu, or nothing.
 */
export function RowMenu({ label, scope, pinScopes, onPin, onRemove, menuRef }: RowMenuProps): React.JSX.Element | null {
	const selectRef = useVscodeElementRef<VscodeContextMenu, { value: string }>('vsc-context-menu-select', (_element, event) => {
		const value = event.detail.value;

		if (value === 'remove') {
			onRemove?.();
		} else {
			onPin?.(pinScopes.find(candidate => candidate === value));
		}
	});

	const items = _itemsOf(scope, pinScopes, onPin !== undefined, onRemove !== undefined);

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
		<span className={`row-menu${scope ? ' is-pinned' : ''}`}>
			{scope && onPin && <vscode-icon className="row-menu-pin" name={scope === 'workspace' ? 'pinned' : 'pin'} size={13} title={scope === 'workspace' ? 'Pinned for everyone' : 'Pinned for you'}></vscode-icon>}
			<button type="button" className="icon-button" aria-label={`More actions for ${label}`} aria-haspopup="menu" title="More actions" onClick={toggle}>
				<vscode-icon name="kebab-vertical" size={14}></vscode-icon>
			</button>
			<vscode-context-menu ref={setMenuRef} data={items}></vscode-context-menu>
		</span>
	);
}

/**
 * The items of the menu of a row: the scopes the property is not pinned in and Unpin while it is
 * pinned, where it can be pinned, then Remove, where the row can be written.
 * @param scope Who the property is pinned for, if it is pinned.
 * @param pinScopes The settings it can be pinned in.
 * @param canPin Whether the property can be pinned.
 * @param canRemove Whether the row can be removed.
 * @returns The items.
 */
function _itemsOf(scope: ScopeKey | undefined, pinScopes: readonly ScopeKey[], canPin: boolean, canRemove: boolean): { label?: string; value?: string; keybinding?: string; separator?: boolean }[] {
	const pins = canPin
		? [
			...pinScopes.filter(candidate => candidate !== scope).map(candidate => ({ label: PIN_SCOPE_LABELS[candidate], value: candidate })),
			...(scope ? [{ label: 'Unpin', value: 'unpin' }] : [])
		]
		: [];
	const removal = canRemove ? [{ label: 'Remove', value: 'remove', keybinding: FormEditorShortcuts.Remove.label }] : [];

	return [...pins, ...(pins.length > 0 && removal.length > 0 ? [{ separator: true }] : []), ...removal];
}

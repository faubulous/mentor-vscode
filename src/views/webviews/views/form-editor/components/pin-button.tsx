import { useRef } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { ScopeKey } from '@src/utilities/config-scope';

/**
 * Properties of the {@link PinButton} component.
 */
export interface PinButtonProps {
	/**
	 * Who the property is pinned for, or `undefined` while it is not pinned.
	 */
	scope?: ScopeKey;

	/**
	 * The settings the property can be pinned in, in the order the menu offers them.
	 */
	pinScopes: readonly ScopeKey[];

	/**
	 * The label of the property, which the button is named after.
	 */
	label: string;

	/**
	 * Pin the property for a scope, or unpin it.
	 * @param scope Who to pin it for, or `undefined` to unpin it.
	 */
	onPin: (scope: ScopeKey | undefined) => void;
}

/**
 * The item of the pin menu for each scope a property can be pinned in.
 */
const PIN_SCOPE_ITEMS: Readonly<Record<ScopeKey, { label: string; note: string }>> = {
	user: { label: 'Pin for me', note: 'only you' },
	workspace: { label: 'Pin for everyone', note: 'shared' }
};

/**
 * The pin of a row: a button whose outline glyph tells a property pinned for oneself and whose
 * filled glyph one pinned for everyone, which opens a menu with an item for each scope the
 * property can be pinned in, and Unpin while the property is pinned. The current choice is
 * checked. The menu hides itself when an item is picked or the user clicks away.
 * @param props The scope of the pin and what the button does.
 * @returns The button and its menu.
 */
export function PinButton({ scope, pinScopes, label, onPin }: PinButtonProps): React.JSX.Element {
	const menuRef = useRef<VscodeContextMenu | null>(null);
	const selectRef = useVscodeElementRef<VscodeContextMenu, { value: string }>('vsc-context-menu-select', (_element, event) => {
		onPin(pinScopes.find(candidate => candidate === event.detail.value));
	});

	const setMenuRef = (element: VscodeContextMenu | null): void => {
		menuRef.current = element;
		selectRef(element);
	};

	const toggle = (): void => {
		if (menuRef.current) {
			menuRef.current.show = !menuRef.current.show;
		}
	};

	const title = _titleOf(scope, label);

	return (
		<span className={`pin-button${scope ? ' is-pinned' : ''}`}>
			<button type="button" className="icon-button" aria-label={title} aria-haspopup="menu" title={title} onClick={toggle}>
				<vscode-icon name={scope === 'workspace' ? 'pinned' : 'pin'} size={14}></vscode-icon>
			</button>
			<vscode-context-menu
				ref={setMenuRef}
				data={[
					...pinScopes.map(candidate => ({ label: PIN_SCOPE_ITEMS[candidate].label, value: candidate, keybinding: `${candidate === scope ? '✓ ' : ''}${PIN_SCOPE_ITEMS[candidate].note}` })),
					...(scope ? [{ separator: true }, { label: 'Unpin', value: 'unpin' }] : [])
				]}
			></vscode-context-menu>
		</span>
	);
}

/**
 * What the pin button of a property is called, by who the property is pinned for.
 * @param scope Who it is pinned for, if it is pinned.
 * @param label The label of the property.
 * @returns The name.
 */
function _titleOf(scope: ScopeKey | undefined, label: string): string {
	switch (scope) {
		case 'user':
			return `${label}: pinned for you`;
		case 'workspace':
			return `${label}: pinned for everyone`;
		default:
			return `Pin ${label}`;
	}
}

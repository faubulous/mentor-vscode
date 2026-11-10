import { useRef } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { PinScope } from '../form-editor-model';

/**
 * Properties of the {@link PinButton} component.
 */
export interface PinButtonProps {
	/**
	 * Who the property is pinned for, or `undefined` while it is not pinned.
	 */
	scope?: PinScope;

	/**
	 * Whether the property can be pinned for everyone, which takes a workspace.
	 */
	canPinForEveryone: boolean;

	/**
	 * The label of the property, which the button is named after.
	 */
	label: string;

	/**
	 * Pin the property for a scope, or unpin it.
	 * @param scope Who to pin it for, or `undefined` to unpin it.
	 */
	onPin: (scope: PinScope | undefined) => void;
}

/**
 * The pin of a row: a button whose outline glyph tells a property pinned for oneself and whose
 * filled glyph one pinned for everyone, which opens a menu with Pin for me, Pin for everyone,
 * where there is a workspace, and Unpin while the property is pinned. The current choice is
 * checked. The menu hides itself when an item is picked or the user clicks away.
 * @param props The scope of the pin and what the button does.
 * @returns The button and its menu.
 */
export function PinButton({ scope, canPinForEveryone, label, onPin }: PinButtonProps): React.JSX.Element {
	const menuRef = useRef<VscodeContextMenu | null>(null);
	const selectRef = useVscodeElementRef<VscodeContextMenu, { value: string }>('vsc-context-menu-select', (_element, event) => {
		const value = event.detail.value;

		onPin(value === 'user' || value === 'workspace' ? value : undefined);
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
					{ label: 'Pin for me', value: 'user', keybinding: scope === 'user' ? '✓ only you' : 'only you' },
					...(canPinForEveryone ? [{ label: 'Pin for everyone', value: 'workspace', keybinding: scope === 'workspace' ? '✓ shared' : 'shared' }] : []),
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
function _titleOf(scope: PinScope | undefined, label: string): string {
	switch (scope) {
		case 'user':
			return `${label}: pinned for you`;
		case 'workspace':
			return `${label}: pinned for everyone`;
		default:
			return `Pin ${label}`;
	}
}

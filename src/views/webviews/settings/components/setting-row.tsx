import * as React from 'react';
import { useContext } from 'react';
import { SettingScope, SettingState } from '../settings-types';
import { MarkdownText } from './markdown-text';
import { SectionHeaderContextMenu, SectionHeaderContextMenuItem } from './section-header-context-menu';
import { SettingsScopeContext } from './setting-context';

/**
 * Props for the SettingRow component, representing a single setting in the 
 * settings UI, including its label, description, current state, and callbacks 
 * for changing its scope or moving it between scopes.
 */
export interface SettingRowProps {
	/**
	 * The label to display for the setting, which can be a string or any React node 
	 * (e.g., to include icons or formatting).
	 */
	label: React.ReactNode;

	/**
	 * An optional description for the setting, which can include markdown formatting. 
	 * This will be rendered below the label in a smaller font size to provide additional 
	 * context or information about the setting.
	 */
	description?: string;

	/**
	 * The current state of the setting, including its value, default value, and 
	 * source (user, workspace, or default). This is used to determine how to display 
	 * the setting (e.g., whether it has been modified from its default value) and 
	 * to provide the appropriate options in the context menu for changing its scope 
	 * or restoring defaults.
	 */
	state: SettingState | undefined;

	/**
	 * Child components representing the control(s) for editing the setting's value 
	 * (e.g., a text input, checkbox, dropdown, etc.). These controls will be rendered 
	 * to the right of the label and description, allowing the user to interact with 
	 * them to change the setting's value.
	 */
	children: React.ReactNode;

	/**
	 * Callback function that is called when the user chooses to change the scope of 
	 * the setting (e.g., from user to workspace or vice versa) or to restore defaults. 
	 * The function receives the new scope ('user', 'workspace', or 'default') and the 
	 * current value of the setting, allowing the parent component to handle the logic 
	 * for updating the setting's value in the appropriate scope or restoring it to its 
	 * default value.
	 * @param newScope The new scope for the setting ('user', 'workspace', or 'default').
	 * @param currentValue The current value of the setting.
	 */
	onScopeChange: (newScope: SettingScope, currentValue: unknown) => void;

	onMoveToScope?: (
		fromScope: 'user' | 'workspace',
		toScope: 'user' | 'workspace',
		currentValue: unknown,
	) => void;
}

/**
 * A row in the settings UI representing a single setting, its description, and controls for editing it.
 * @param props The props for the setting row.
 * @returns A JSX element representing the setting row.
 */
export function SettingRow({ label, description, state, onScopeChange, onMoveToScope, children }: SettingRowProps) {
	const activeScope = useContext(SettingsScopeContext);
	const source = state?.source ?? 'default';
	const isModified = source === activeScope && !valuesEqual(state?.value, state?.defaultValue);
	const otherScope: 'user' | 'workspace' = activeScope === 'user' ? 'workspace' : 'user';
	const otherScopeLabel = activeScope === 'user' ? 'Workspace' : 'User';

	const menuItems: SectionHeaderContextMenuItem[] = [
		...(source !== 'default'
			? [{ label: 'Restore defaults', onClick: () => onScopeChange('default', state?.value) }]
			: []),
		{ label: `Copy to ${otherScopeLabel} Scope`, onClick: () => onScopeChange(otherScope, state?.value) },
		...(isModified && onMoveToScope
			? [{ label: `Move to ${otherScopeLabel} Scope`, onClick: () => onMoveToScope(activeScope, otherScope, state?.value) }]
			: []),
	];

	return (
		<div className="setting-row">
			<div className="setting-row-header">
				<span className="setting-label">{label}</span>
				{isModified && <span className="setting-modified-tag" title={`Modified in ${activeScope} settings`}>MODIFIED</span>}
				<span className="setting-leader" aria-hidden="true" />
				<SectionHeaderContextMenu items={menuItems} />
			</div>
			{description && <p className="setting-description"><MarkdownText text={description} /></p>}
			<div className="setting-control">{children}</div>
		</div>
	);
}

function valuesEqual(a: unknown, b: unknown): boolean {
	if (a === b) {
		return true;
	} else {
		return JSON.stringify(a) === JSON.stringify(b);
	}
}
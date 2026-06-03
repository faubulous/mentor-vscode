import * as React from 'react';
import { useContext } from 'react';
import { SettingScope, SettingState } from '../settings-types';
import { MarkdownText } from './markdown-text';
import { SectionHeaderContextMenu, SectionHeaderContextMenuItem } from '@src/views/webviews/components/section-header-context-menu';
import { SettingsMoveContext, SettingsScopeContext } from './setting-context';

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
	 * Writes the setting's value at the given scope. When `deleteScope` is provided
	 * the value is also cleared from that scope (move semantics); otherwise only the
	 * target scope is written (copy / restore semantics).
	 * @param currentValue The current value of the setting.
	 * @param newScope The scope to write the value to ('user', 'workspace', or 'default').
	 * @param deleteScope The scope to clear after writing (move only).
	 */
	setScope: (currentValue: unknown, newScope: SettingScope, deleteScope?: 'user' | 'workspace') => void;
}

/**
 * A row in the settings UI representing a single setting, its description, and controls for editing it.
 * @param props The props for the setting row.
 * @returns A JSX element representing the setting row.
 */
export function SettingRow({ label, description, state, setScope, children }: SettingRowProps) {
	const panelScope = useContext(SettingsScopeContext);
	const settingScope = state?.scope ?? 'default';
	const otherScope: 'user' | 'workspace' = panelScope === 'user' ? 'workspace' : 'user';
	const otherScopeLabel = panelScope === 'user' ? 'Workspace' : 'User';
	const canMove = useContext(SettingsMoveContext) !== null;
	const isModified = settingScope === panelScope && !valuesEqual(state?.value, state?.defaultValue);

	const menuItems: SectionHeaderContextMenuItem[] = [
		...(settingScope !== 'default'
			? [
				{ label: 'Restore defaults', onClick: () => setScope(state?.value, 'default') },
				{ separator: true } as const
			]
			: []),
		{ label: `Copy to ${otherScopeLabel} Scope`, onClick: () => setScope(state?.value, otherScope) },
		...(isModified && canMove
			? [{ label: `Move to ${otherScopeLabel} Scope`, onClick: () => setScope(state?.value, otherScope, panelScope) }]
			: []),
	];

	return (
		<div className={`setting-row${isModified ? ' setting-row-modified' : ''}`}>
			<div className="setting-row-header">
				<span className="setting-label">{label}</span>
				{state?.experimental && <span className="badge-experimental">Experimental</span>}
				{isModified && <span className="setting-modified-tag" title={`Modified in ${panelScope} settings`}>MODIFIED</span>}
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
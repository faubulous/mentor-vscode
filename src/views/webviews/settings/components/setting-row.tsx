import * as React from 'react';
import { useContext } from 'react';
import { SettingScope, SettingState, LanguageId } from '../settings-panel-messages';
import { EditorSettings } from './types';
import { MarkdownText } from '../../components/markdown-text';
import { SectionHeaderContextMenu, SectionHeaderContextMenuItem } from './section-header-context-menu';

// ── Scope context ──────────────────────────────────────────────

/**
 * Provides the currently active settings scope tab ('user' | 'workspace')
 * to all descendant SettingRow and SectionHeader components without prop drilling.
 */
export const SettingsScopeContext = React.createContext<'user' | 'workspace'>('user');

/**
 * Provides a callback for moving a setting from one scope to another (copy + clear source).
 */
export const SettingsMoveContext = React.createContext<
	((key: string, fromScope: 'user' | 'workspace', toScope: 'user' | 'workspace', value: unknown) => void) | null
>(null);

/**
 * Provides a callback for moving an editor setting from one scope to another (copy + clear source).
 */
export const EditorSettingsMoveContext = React.createContext<
	((languageId: LanguageId, key: string, fromScope: 'user' | 'workspace', toScope: 'user' | 'workspace', value: unknown) => void) | null
>(null);

// ── MoreVertMenu ───────────────────────────────────────────────

function valuesEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	return JSON.stringify(a) === JSON.stringify(b);
}

// ── SettingRow ─────────────────────────────────────────────────

export interface SettingRowProps {
	label: React.ReactNode;
	description?: string;
	settingKey: string;
	settings: Record<string, SettingState>;
	onScopeChange: (key: string, newScope: SettingScope, currentValue: unknown) => void;
	children: React.ReactNode;
}

export function SettingRow({ label, description, settingKey, settings, onScopeChange, children }: SettingRowProps) {
	const activeScope = useContext(SettingsScopeContext);
	const onMoveToScope = useContext(SettingsMoveContext);
	const state = settings[settingKey];
	const source = state?.source ?? 'default';
	const isModified = source === activeScope && !valuesEqual(state?.value, state?.defaultValue);
	const otherScope: 'user' | 'workspace' = activeScope === 'user' ? 'workspace' : 'user';
	const otherScopeLabel = activeScope === 'user' ? 'Workspace' : 'User';

	const menuItems: SectionHeaderContextMenuItem[] = [
		...(source !== 'default'
			? [{ label: 'Restore defaults', onClick: () => onScopeChange(settingKey, 'default', state?.value) }]
			: []),
		{ label: `Copy to ${otherScopeLabel} Scope`, onClick: () => onScopeChange(settingKey, otherScope, state?.value) },
		...(isModified && onMoveToScope
			? [{ label: `Move to ${otherScopeLabel} Scope`, onClick: () => onMoveToScope(settingKey, activeScope, otherScope, state?.value) }]
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

// ── EditorSettingRow ───────────────────────────────────────────

export interface EditorSettingRowProps {
	label: React.ReactNode;
	description?: string;
	settingKey: string;
	languageId: LanguageId;
	editorSettings: EditorSettings;
	onScopeChange: (languageId: LanguageId, key: string, newScope: SettingScope, currentValue: unknown) => void;
	children: React.ReactNode;
}

export function EditorSettingRow({ label, description, settingKey, languageId, editorSettings, onScopeChange, children }: EditorSettingRowProps) {
	const activeScope = useContext(SettingsScopeContext);
	const onMoveToScope = useContext(EditorSettingsMoveContext);
	const state = editorSettings[languageId]?.[settingKey];
	const source = state?.source ?? 'default';
	const isModified = source === activeScope && !valuesEqual(state?.value, state?.defaultValue);
	const otherScope: 'user' | 'workspace' = activeScope === 'user' ? 'workspace' : 'user';
	const otherScopeLabel = activeScope === 'user' ? 'Workspace' : 'User';

	const menuItems: SectionHeaderContextMenuItem[] = [
		...(source !== 'default'
			? [{ label: 'Restore default', onClick: () => onScopeChange(languageId, settingKey, 'default', state?.value) }]
			: []),
		{ label: `Copy to ${otherScopeLabel} Scope`, onClick: () => onScopeChange(languageId, settingKey, otherScope, state?.value) },
		...(isModified && onMoveToScope
			? [{ label: `Move to ${otherScopeLabel} Scope`, onClick: () => onMoveToScope(languageId, settingKey, activeScope, otherScope, state?.value) }]
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



import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { SettingScope, SettingState, LanguageId } from '../settings-panel-messages';
import { EditorSettings } from './types';

// ── MoreVertMenu ───────────────────────────────────────────────

export interface MenuItem {
	label: string;
	onClick: () => void;
}

export function MoreVertMenu({ items }: { items: MenuItem[] }) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open]);

	if (items.length === 0) return null;

	return (
		<div className="more-vert-container" ref={containerRef}>
			<button className="more-vert-button" onClick={() => setOpen(o => !o)} title="More actions">
				⋮
			</button>
			{open && (
				<div className="more-vert-menu">
					{items.map(item => (
						<button
							key={item.label}
							className="more-vert-item"
							onClick={() => { item.onClick(); setOpen(false); }}
						>
							{item.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ── SectionHeader ──────────────────────────────────────────────

export interface SectionHeaderProps {
	title: React.ReactNode;
	keys?: string[];
	settings?: Record<string, SettingState>;
	onBulkScope?: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function SectionHeader({ title, keys, settings, onBulkScope }: SectionHeaderProps) {
	const nonDefault = keys && settings
		? keys.filter(k => settings[k]?.source !== 'default')
		: [];

	const menuItems: MenuItem[] = nonDefault.length > 0 && onBulkScope
		? [
			{ label: 'Copy all to User', onClick: () => onBulkScope(nonDefault, 'user') },
			{ label: 'Copy all to Workspace', onClick: () => onBulkScope(nonDefault, 'workspace') },
		]
		: [];

	return (
		<div className="section-header">
			<h2 className="settings-section-title">{title}</h2>
			<MoreVertMenu items={menuItems} />
		</div>
	);
}

// ── ScopeSelector ──────────────────────────────────────────────

export interface ScopeSelectorProps {
	source: SettingScope;
	onChange: (scope: SettingScope) => void;
}

export function ScopeSelector({ source, onChange }: ScopeSelectorProps) {
	const displayValue = source === 'default' ? 'user' : source;
	const title = source === 'default'
		? 'Using default value — select to save'
		: source === 'user'
		? 'Stored in User settings'
		: 'Stored in Workspace settings';

	return (
		<select
			className={`scope-selector source-${source}`}
			value={displayValue}
			onChange={e => onChange(e.target.value as SettingScope)}
			title={title}
		>
			<option value="user">User</option>
			<option value="workspace">Workspace</option>
		</select>
	);
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
	const state = settings[settingKey];
	const source = state?.source ?? 'default';

	return (
		<div className="setting-row">
			<div className="setting-row-header">
				<span className="setting-label">{label}</span>
				<span className="setting-leader" aria-hidden="true" />
				<ScopeSelector
					source={source}
					onChange={scope => onScopeChange(settingKey, scope, state?.value)}
				/>
			</div>
			{description && <p className="setting-description">{description}</p>}
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
	const state = editorSettings[languageId]?.[settingKey];
	const source = state?.source ?? 'default';

	return (
		<div className="setting-row">
			<div className="setting-row-header">
				<span className="setting-label">{label}</span>
				<span className="setting-leader" aria-hidden="true" />
				<ScopeSelector
					source={source}
					onChange={scope => onScopeChange(languageId, settingKey, scope, state?.value)}
				/>
			</div>
			{description && <p className="setting-description">{description}</p>}
			<div className="setting-control">{children}</div>
		</div>
	);
}


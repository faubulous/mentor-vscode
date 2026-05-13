import { useContext } from "react";
import { SettingState } from "../settings-types";
import { SectionHeaderContextMenu, SectionHeaderContextMenuItem } from "./section-header-context-menu";
import { SettingsScopeContext } from "./setting-context";

export interface SectionHeaderProps {
	title: React.ReactNode;
	keys?: string[];
	settings?: Record<string, SettingState>;
	onBulkScope?: (keys: string[], scope: 'user' | 'workspace') => void;
}

/**
 * A header for a settings section, which can optionally display a context 
 * menu with bulk actions if any of the settings in the section have been 
 * modified from their default values.
 * @param param0 The props for the SectionHeader component.
 * @returns A JSX element representing the section header.
 */
export function SectionHeader({ title, keys, settings, onBulkScope }: SectionHeaderProps) {
	const activeScope = useContext(SettingsScopeContext);
	const otherScope: 'user' | 'workspace' = activeScope === 'user' ? 'workspace' : 'user';
	const otherScopeLabel = activeScope === 'user' ? 'Workspace' : 'User';

	const modifiedKeys = keys && settings
		? keys.filter(k => settings[k]?.scope !== 'default')
		: [];

	const menuItems: SectionHeaderContextMenuItem[] = modifiedKeys.length > 0 && onBulkScope
		? [{ label: `Copy all to ${otherScopeLabel}`, onClick: () => onBulkScope(modifiedKeys, otherScope) }]
		: [];

	return (
		<div className="section-header">
			<h2 className="settings-section-title">{title}</h2>
			<SectionHeaderContextMenu items={menuItems} />
		</div>
	);
}
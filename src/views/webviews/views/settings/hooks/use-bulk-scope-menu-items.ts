import { useContext } from 'react';
import { SettingState, SettingsSource } from "../settings-types";
import { ScopeKey } from '@src/utilities/config-scope';
import { SectionHeaderContextMenuItem } from "@src/views/webviews/components/section-header-context-menu";
import { SettingsWorkspaceContext } from '../components/setting-context';

/**
 * Computes the "Apply all to <scope>" menu items for a section header. Offers an explicit
 * User and Workspace target (the per-row dropdowns handle individual moves). The items are
 * always rendered so every section header keeps the same layout; they are disabled when no
 * setting in the section has been modified (or, for Workspace, when no workspace is open).
 * Returns an empty list only when no handler was provided.
 */
export function useBulkScopeMenuItems(
	source: SettingsSource,
	keys: string[] | undefined,
	settings: Record<string, SettingState> | undefined,
	onBulkScope: ((source: SettingsSource, keys: string[], scope: ScopeKey) => void) | undefined,
): SectionHeaderContextMenuItem[] {
	const hasWorkspace = useContext(SettingsWorkspaceContext);

	const modifiedKeys = keys && settings
		? keys.filter(k => settings[k]?.scope !== 'default')
		: [];

	if (!onBulkScope) {
		return [];
	}

	const disabled = modifiedKeys.length === 0;

	return [
		{ label: 'Apply all to User', onClick: () => onBulkScope(source, modifiedKeys, 'user'), disabled },
		{ label: 'Apply all to Workspace', onClick: () => onBulkScope(source, modifiedKeys, 'workspace'), disabled: disabled || !hasWorkspace },
	];
}

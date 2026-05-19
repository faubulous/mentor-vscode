import { useContext } from "react";
import { SettingState, SettingsSource } from "../settings-types";
import { SectionHeaderContextMenuItem } from "@src/views/webviews/components/section-header-context-menu";
import { SettingsScopeContext } from "./setting-context";

/**
 * Computes the "Copy all to <other scope>" menu item for a section header.
 * Returns an empty list when there is nothing to copy or no handler was provided.
 */
export function useBulkScopeMenuItems(
	source: SettingsSource,
	keys: string[] | undefined,
	settings: Record<string, SettingState> | undefined,
	onBulkScope: ((source: SettingsSource, keys: string[], scope: 'user' | 'workspace') => void) | undefined,
): SectionHeaderContextMenuItem[] {
	const activeScope = useContext(SettingsScopeContext);
	const otherScope: 'user' | 'workspace' = activeScope === 'user' ? 'workspace' : 'user';
	const otherScopeLabel = activeScope === 'user' ? 'Workspace' : 'User';

	const modifiedKeys = keys && settings
		? keys.filter(k => settings[k]?.scope !== 'default')
		: [];

	if (modifiedKeys.length === 0 || !onBulkScope) {
		return [];
	}

	return [{ label: `Copy all to ${otherScopeLabel}`, onClick: () => onBulkScope(source, modifiedKeys, otherScope) }];
}

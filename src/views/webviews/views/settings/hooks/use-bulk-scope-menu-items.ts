import { SettingState, SettingsSource } from "../settings-types";
import { ScopeKey } from '@src/utilities/config-scope';
import { SectionHeaderContextMenuItem } from "@src/views/webviews/components/section-header-context-menu";

/**
 * Computes the "Copy all to <scope>" menu items for a section header. Offers an explicit
 * User and Workspace target (the per-row dropdowns handle individual moves). Returns an
 * empty list when there is nothing to copy or no handler was provided.
 */
export function useBulkScopeMenuItems(
	source: SettingsSource,
	keys: string[] | undefined,
	settings: Record<string, SettingState> | undefined,
	onBulkScope: ((source: SettingsSource, keys: string[], scope: ScopeKey) => void) | undefined,
): SectionHeaderContextMenuItem[] {
	const modifiedKeys = keys && settings
		? keys.filter(k => settings[k]?.scope !== 'default')
		: [];

	if (modifiedKeys.length === 0 || !onBulkScope) {
		return [];
	}

	return [
		{ label: 'Copy all to User', onClick: () => onBulkScope(source, modifiedKeys, 'user') },
		{ label: 'Copy all to Workspace', onClick: () => onBulkScope(source, modifiedKeys, 'workspace') },
	];
}

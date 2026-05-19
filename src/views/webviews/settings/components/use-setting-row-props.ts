import { useCallback, useContext } from 'react';
import { SettingScope, SettingState, SettingsSource } from '../settings-types';
import { SettingsMoveContext } from './setting-context';

/**
 * Generates props for a SettingRow component for the given source's slice of
 * settings. The `source` is bound into both the scope-change callback and the
 * move-between-scopes context so individual rows don't need to know which
 * bucket they belong to.
 *
 * @param source        Which configuration bucket these settings live in.
 * @param settings      The slice of settings for this source, indexed by key.
 * @param onScopeChange Callback invoked when a row's scope chip is changed.
 */
export function useSettingRowProps(
	source: SettingsSource,
	settings: Record<string, SettingState>,
	onScopeChange: (source: SettingsSource, key: string, scope: SettingScope, currentValue: unknown) => void,
) {
	const onMove = useContext(SettingsMoveContext);

	return useCallback((key: string) => {
		const state = settings[key];
		return {
			label: state?.title ?? '',
			description: state?.description ?? '',
			state,
			setScope: makeSetScope(source, key, onScopeChange, onMove),
		};
	}, [source, settings, onScopeChange, onMove]);
}

/**
 * Build the `setScope` callback wired into a single SettingRow. When the row
 * requests a move (`deleteScope` set), routes through the move context;
 * otherwise routes through the simple scope-change callback.
 */
function makeSetScope(
	source: SettingsSource,
	key: string,
	onScopeChange: (source: SettingsSource, key: string, scope: SettingScope, value: unknown) => void,
	onMove: ((source: SettingsSource, key: string, from: 'user' | 'workspace', to: 'user' | 'workspace', value: unknown) => void) | null,
) {
	return (value: unknown, scope: SettingScope, deleteScope?: 'user' | 'workspace') =>
		deleteScope !== undefined
			? onMove?.(source, key, deleteScope, scope as 'user' | 'workspace', value)
			: onScopeChange(source, key, scope, value);
}

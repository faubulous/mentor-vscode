import { useCallback, useContext } from 'react';
import { SettingScope, SettingState, SettingsSource } from '../settings-types';
import { SettingsScopeTargetContext, SettingsWorkspaceContext } from '../components/setting-context';

/**
 * Generates props for a SettingRow component for the given source's slice of
 * settings. The `source` is bound into the scope callbacks so individual rows
 * don't need to know which bucket they belong to. The per-key scope target and
 * workspace availability are pulled from context.
 *
 * @param source        Which configuration bucket these settings live in.
 * @param settings      The slice of settings for this source, indexed by key.
 * @param onScopeChange Callback invoked when a row restores a setting to its default.
 */
export function useSettingRowProps(
	source: SettingsSource,
	settings: Record<string, SettingState>,
	onScopeChange: (source: SettingsSource, key: string, scope: SettingScope, currentValue: unknown) => void,
) {
	const scopeTarget = useContext(SettingsScopeTargetContext);
	const hasWorkspace = useContext(SettingsWorkspaceContext);

	return useCallback((key: string) => {
		const state = settings[key];
		return {
			label: state?.title ?? '',
			description: state?.description ?? '',
			state,
			setScope: (value: unknown, scope: SettingScope) => onScopeChange(source, key, scope, value),
			scope: scopeTarget?.get(source, key, state) ?? 'user',
			hasWorkspace,
			onScopeSelect: (newScope: 'user' | 'workspace') => scopeTarget?.select(source, key, newScope, state),
		};
	}, [source, settings, onScopeChange, scopeTarget, hasWorkspace]);
}

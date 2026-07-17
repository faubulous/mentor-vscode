import { useCallback, useContext } from 'react';
import { ScopeKey } from '@src/utilities/config-scope';
import { SettingScope, SettingState, SettingsSource } from '../settings-types';
import { SettingsExecuteCommandContext, SettingsScopeTargetContext, SettingsWorkspaceContext } from '../components/setting-context';

/**
 * The full VS Code setting id for a key in the given source's bucket, as it appears
 * in settings.json — `mentor.*` for Mentor keys, `editor.*` for the built-in editor
 * keys surfaced per language.
 */
export function settingIdOf(source: SettingsSource, key: string): string {
	return source.kind === 'mentor' ? `mentor.${key}` : `editor.${key}`;
}

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
	const executeCommand = useContext(SettingsExecuteCommandContext);

	return useCallback((key: string) => {
		const state = settings[key];
		const settingId = settingIdOf(source, key);
		return {
			label: state?.title ?? '',
			description: state?.description ?? '',
			state,
			settingId,
			setScope: (value: unknown, scope: SettingScope) => onScopeChange(source, key, scope, value),
			scope: scopeTarget?.get(source, key, state) ?? 'user',
			hasWorkspace,
			onScopeSelect: (newScope: ScopeKey) => scopeTarget?.select(source, key, newScope, state),
			onEditInSettings: executeCommand
				? () => executeCommand('workbench.action.openSettings', settingId)
				: undefined,
		};
	}, [source, settings, onScopeChange, scopeTarget, hasWorkspace, executeCommand]);
}

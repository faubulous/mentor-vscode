import { useCallback, useContext } from 'react';
import { LanguageId } from '@src/services/document/document-factory';
import { SettingScope, SettingState } from '../settings-types';
import { SettingsMoveContext, VSCodeSettingsMoveContext } from './setting-context';
import { VSCodeSettings } from './types';

/**
 * A custom hook that generates props for a SettingRow component based on the current 
 * settings and a callback for changing the setting's scope.
 * @param settings The current settings state.
 * @param onScopeChange A callback function to change the scope of a setting.
 * @returns A function that generates props for a SettingRow component.
 */
export function useSettingRowProps(
	settings: Record<string, SettingState>,
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void,
) {
	const onMove = useContext(SettingsMoveContext);

	return useCallback((key: string) => {
		const state = settings[key];
		return {
			label: state?.title ?? '',
			description: state?.description ?? '',
			state,
			setScope: makeSetScope(key, onScopeChange, onMove),
		};
	}, [settings, onScopeChange, onMove]);
}

/**
 * A custom hook that generates props for a SettingRow component for VSCode settings, based 
 * on the current settings state and a callback for changing the setting's scope.
 * @param settings The current VSCode settings state.
 * @param languageId The language ID for which the settings are being generated.
 * @param onScopeChange A callback function to change the scope of a setting.
 * @returns A function that generates props for a SettingRow component.
 */
export function useVSCodeSettingRowProps(
	settings: VSCodeSettings,
	languageId: LanguageId,
	onScopeChange: (lang: LanguageId, key: string, scope: SettingScope, currentValue: unknown) => void,
) {
	const onMove = useContext(VSCodeSettingsMoveContext);

	return useCallback((key: string) => ({
		state: settings[languageId]?.[key],
		setScope: makeSetScope(
			key,
			(k, scope, value) => onScopeChange(languageId, k, scope, value),
			onMove ? (k, from, to, value) => onMove(languageId, k, from, to, value) : null,
		),
	}), [settings, languageId, onScopeChange, onMove]);
}

/**
 * Create a setScope function for a specific setting key, using the provided callbacks 
 * for changing scope and moving settings.
 * @param key The key of the setting.
 * @param onScopeChange Callback for changing the scope of the setting.
 * @param onMove Callback for moving the setting between scopes.
 * @returns A function that can be used to set the scope of the setting.
 */
function makeSetScope(
	key: string,
	onScopeChange: (key: string, scope: SettingScope, value: unknown) => void,
	onMove: ((key: string, from: 'user' | 'workspace', to: 'user' | 'workspace', value: unknown) => void) | null,
) {
	return (value: unknown, scope: SettingScope, deleteScope?: 'user' | 'workspace') =>
		deleteScope !== undefined
			? onMove?.(key, deleteScope, scope as 'user' | 'workspace', value)
			: onScopeChange(key, scope, value);
}
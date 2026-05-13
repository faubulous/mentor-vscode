import { useCallback, useContext } from 'react';
import { LanguageId } from '@src/services/document/document-factory';
import { SettingScope, SettingState } from '../settings-types';
import { SettingsMoveContext, VSCodeSettingsMoveContext } from './setting-context';
import { VSCodeSettings } from './types';

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
			onScopeChange: (scope: SettingScope, value: unknown) => onScopeChange(key, scope, value),
			onMoveToScope: onMove
				? (from: 'user' | 'workspace', to: 'user' | 'workspace', value: unknown) => onMove(key, from, to, value)
				: undefined,
		};
	}, [settings, onScopeChange, onMove]);
}

export function useVSCodeSettingRowProps(
	vscodeSettings: VSCodeSettings,
	languageId: LanguageId,
	onScopeChange: (lang: LanguageId, key: string, scope: SettingScope, currentValue: unknown) => void,
) {
	const onMove = useContext(VSCodeSettingsMoveContext);
	return useCallback((key: string) => ({
		state: vscodeSettings[languageId]?.[key],
		onScopeChange: (scope: SettingScope, value: unknown) => onScopeChange(languageId, key, scope, value),
		onMoveToScope: onMove
			? (from: 'user' | 'workspace', to: 'user' | 'workspace', value: unknown) => onMove(languageId, key, from, to, value)
			: undefined,
	}), [vscodeSettings, languageId, onScopeChange, onMove]);
}

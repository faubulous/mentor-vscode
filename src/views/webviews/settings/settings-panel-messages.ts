import { LanguageId } from '@src/services/document/document-factory';
import { SettingScope, SettingState } from './settings-types';

export type SettingsPanelMessages =
	{ id: 'GetSettings' } |
	{ id: 'GetSettingsResult'; settings: Record<string, SettingState> } |
	{ id: 'OnSettingsChanged'; settings: Record<string, SettingState> } |
	{ id: 'UpdateSetting'; key: string; value: unknown; scope: SettingScope } |
	{ id: 'GetVSCodeSettings'; languageId: LanguageId } |
	{ id: 'GetVSCodeSettingsResult'; languageId: LanguageId; settings: Record<string, SettingState> } |
	{ id: 'OnVSCodeSettingsChanged'; languageId: LanguageId; settings: Record<string, SettingState> } |
	{ id: 'UpdateVSCodeSetting'; languageId: LanguageId; key: string; value: unknown; scope: SettingScope } |
	{ id: 'GetVersion' } |
	{ id: 'GetVersionResult'; version: string } |
	{ id: 'NavigateTo'; section: string };

import { SettingScope, SettingState, SettingsSource } from './settings-types';
import { ExecuteCommandMessage } from '../../webview-messaging';

/**
 * Messages exchanged between the settings panel webview and the extension.
 *
 * All settings traffic is parameterized by a `SettingsSource` discriminator so
 * mentor (`mentor.*`) and language-scoped editor (`[turtle].editor.*`, …)
 * buckets share a single wire format.
 */
export type SettingsPanelMessages =
	ExecuteCommandMessage |
	{ id: 'GetSettings'; source: SettingsSource } |
	{ id: 'GetSettingsResult'; source: SettingsSource; settings: Record<string, SettingState> } |
	{ id: 'OnSettingsChanged'; source: SettingsSource; settings: Record<string, SettingState> } |
	{ id: 'UpdateSetting'; source: SettingsSource; key: string; value: unknown; scope: SettingScope } |
	{ id: 'GetVersion' } |
	{ id: 'GetVersionResult'; version: string } |
	{ id: 'NavigateTo'; section: string };

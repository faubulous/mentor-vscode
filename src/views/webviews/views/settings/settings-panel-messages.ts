import { SettingScope, SettingState, SettingsSource } from './settings-types';
import { ExecuteCommandMessage } from '../../webview-messaging';
import { ConnectionEditorMessages } from './sections/query/connection-editor-messages';
import { ConnectionsListMessages } from './sections/query/connections-list-messages';
import { StoresSectionMessages } from './sections/query/stores-messages';
import { IndexingMessages } from './sections/workspace/indexing-messages';
import { ValidationProfilesMessages } from './sections/validation/profiles-messages';

/**
 * Messages routed between a settings section webview component and its section
 * controller on the host. Each message carries the `section` discriminator the
 * shell uses to dispatch it to the registered controller — pairing each section
 * id with exactly the message union that section speaks.
 */
export type SettingsSectionMessages =
	| ({ section: 'query.connections' } & (ConnectionsListMessages | ConnectionEditorMessages))
	| ({ section: 'query.stores' } & StoresSectionMessages)
	| ({ section: 'workspace.indexing' } & IndexingMessages)
	| ({ section: 'validation.profiles' } & ValidationProfilesMessages);

/**
 * Messages exchanged between the settings panel webview and the extension.
 *
 * All settings traffic is parameterized by a `SettingsSource` discriminator so
 * mentor (`mentor.*`) and language-scoped editor (`[turtle].editor.*`, …)
 * buckets share a single wire format.
 */
export type SettingsPanelMessages =
	SettingsSectionMessages |
	ExecuteCommandMessage |
	{ id: 'GetSettings'; source: SettingsSource } |
	{ id: 'GetSettingsResult'; source: SettingsSource; settings: Record<string, SettingState> } |
	{ id: 'OnSettingsChanged'; source: SettingsSource; settings: Record<string, SettingState> } |
	{ id: 'UpdateSetting'; source: SettingsSource; key: string; value: unknown; scope: SettingScope } |
	{ id: 'GetVersion' } |
	{ id: 'GetVersionResult'; version: string } |
	{ id: 'GetLanguageLabels' } |
	{ id: 'GetLanguageLabelsResult'; labels: Record<string, string> } |
	{ id: 'GetWorkspaceState' } |
	{ id: 'WorkspaceStateChanged'; hasWorkspace: boolean } |
	{ id: 'NavigateTo'; section: string };

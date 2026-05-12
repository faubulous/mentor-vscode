import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { ExecuteCommandMessage } from '@src/views/webviews/webview-messaging';

export type SettingScope = 'default' | 'user' | 'workspace';

export type SettingState = {
	value: unknown;
	defaultValue: unknown;
	source: SettingScope;
	title: string;
	description: string;
};

export type FormattingLanguage = 'turtle' | 'sparql';

export type LanguageId = 'turtle' | 'sparql' | 'trig' | 'n3' | 'ntriples' | 'nquads';

export type SettingsPanelMessages =
	ExecuteCommandMessage |
	{ id: 'GetSettings' } |
	{ id: 'GetSettingsResult'; settings: Record<string, SettingState> } |
	{ id: 'OnSettingsChanged'; settings: Record<string, SettingState> } |
	{ id: 'OnSettingsChanged'; settings: Record<string, SettingState> } |
	{ id: 'UpdateSetting'; key: string; value: unknown; scope: SettingScope } |
	{ id: 'GetEditorSettings'; languageId: LanguageId } |
	{ id: 'GetEditorSettingsResult'; languageId: LanguageId; settings: Record<string, SettingState> } |
	{ id: 'OnEditorSettingsChanged'; languageId: LanguageId; settings: Record<string, SettingState> } |
	{ id: 'UpdateEditorSetting'; languageId: LanguageId; key: string; value: unknown; scope: SettingScope } |
	{ id: 'GetConnections' } |
	{ id: 'GetConnectionsResult'; connections: SparqlConnection[] } |
	{ id: 'ConnectionsChanged'; connections: SparqlConnection[] } |
	{ id: 'CreateConnection' } |
	{ id: 'EditConnection'; connection: SparqlConnection } |
	{ id: 'DeleteConnection'; connection: SparqlConnection } |
	{ id: 'MoveConnection'; connection: SparqlConnection; toScope: ConfigurationScope } |
	{ id: 'TestConnection'; connection: SparqlConnection } |
	{ id: 'TestConnectionResult'; connectionId: string; success: boolean; error?: string } |
	{ id: 'ListGraphs'; connection: SparqlConnection } |
	{ id: 'OpenInBrowser'; url: string } |
	{ id: 'GetVersion' } |
	{ id: 'GetVersionResult'; version: string } |
	{ id: 'NavigateTo'; section: string };

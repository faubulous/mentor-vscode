import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { SparqlConnectionMessages } from '@src/views/webviews/sparql-connection/sparql-connection-messages';
import { SparqlConnectionsListMessages } from '@src/views/webviews/sparql-connections-list/sparql-connections-list-messages';

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
	{ id: 'GetSettings' } |
	{ id: 'GetSettingsResult'; settings: Record<string, SettingState> } |
	{ id: 'OnSettingsChanged'; settings: Record<string, SettingState> } |
	{ id: 'UpdateSetting'; key: string; value: unknown; scope: SettingScope } |
	{ id: 'GetEditorSettings'; languageId: LanguageId } |
	{ id: 'GetEditorSettingsResult'; languageId: LanguageId; settings: Record<string, SettingState> } |
	{ id: 'OnEditorSettingsChanged'; languageId: LanguageId; settings: Record<string, SettingState> } |
	{ id: 'UpdateEditorSetting'; languageId: LanguageId; key: string; value: unknown; scope: SettingScope } |
	{ id: 'MoveConnection'; connection: SparqlConnection; toScope: ConfigurationScope } |
	{ id: 'GetVersion' } |
	{ id: 'GetVersionResult'; version: string } |
	{ id: 'NavigateTo'; section: string } |
	{ id: 'OpenConnectionForm'; connection: SparqlConnection } |
	SparqlConnectionsListMessages |
	SparqlConnectionMessages;

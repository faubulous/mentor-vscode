import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { SparqlConnectionController } from '@src/views/webviews/sparql-connection/sparql-connection-controller';
import { WebviewController } from '@src/views/webviews/webview-controller';
import { getConfig } from '@src/utilities/vscode/config';
import { SettingsPanelMessages, SettingScope, SettingState, LanguageId } from './settings-panel-messages';

const MENTOR_SETTING_KEYS = [
	'editor.codeLensEnabled',
	'prefixes.autoDefinePrefixes',
	'prefixes.prefixDefinitionMode',
	'prefixes.queryParameterName',
	'formatting.turtle.maxLineWidth',
	'formatting.turtle.spaceBeforePunctuation',
	'formatting.turtle.blankLinesBetweenSubjects',
	'formatting.sparql.uppercaseKeywords',
	'formatting.sparql.alignPatterns',
	'formatting.sparql.sameBraceLine',
	'formatting.sparql.separateClauses',
	'formatting.sparql.maxLineWidth',
	'formatting.sparql.spaceBeforePunctuation',
	'sorting.typeSortingOptions',
	'language.sparql.defaultDocumentTemplate',
	'language.sparql.documentQueryTemplate',
	'language.turtle.defaultDocumentTemplate',
	'language.trig.defaultDocumentTemplate',
	'language.n3.defaultDocumentTemplate',
	'language.ntriples.defaultDocumentTemplate',
	'language.nquads.defaultDocumentTemplate',
	'index.maxFileSize',
	'index.useGitIgnore',
	'index.ignoreFolders',
	'index.includeFiles',
	'sparql.defaultInferenceEnabled',
	'sparql.queryTimeout',
	'sparql.listGraphsQuery',
	'sparql.dropGraphQuery',
	'sparql.describeQueryTemplate',
	'namespaces',
	'predicates.label',
	'predicates.description',
	'definitionTree.labelStyle',
	'definitionTree.defaultLayout',
	'definitionTree.defaultLanguageTag',
	'definitionTree.decorateMissingLanguageTags',
	'shacl.enabled',
	'inference.enabled',
];

const EDITOR_SETTING_KEYS = ['tabSize', 'insertSpaces', 'wordWrap', 'formatOnSave'];

const MENTOR_LANGUAGES: LanguageId[] = ['turtle', 'sparql', 'trig', 'n3', 'ntriples', 'nquads'];

export class SettingsPanelController extends WebviewController<SettingsPanelMessages> {
	constructor() {
		super({
			componentPath: 'settings-panel.js',
			panelId: 'mentorSettingsPanel',
			panelTitle: 'Mentor Settings',
			panelIcon: 'settings-gear',
		});

		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);

		this.subscribe(
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('mentor')) {
					this.postMessage({ id: 'OnSettingsChanged', settings: this._readAllSettings() });
				}

				for (const languageId of MENTOR_LANGUAGES) {
					if (e.affectsConfiguration(`[${languageId}]`)) {
						this.postMessage({
							id: 'OnEditorSettingsChanged',
							languageId,
							settings: this._readEditorSettings(languageId),
						});
					}
				}
			}),
			connectionService.onDidChangeConnections(() => {
				this.postMessage({
					id: 'ConnectionsChanged',
					connections: container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService).getConnections(),
				});
			})
		);
	}

	async show(viewColumn?: vscode.ViewColumn): Promise<void> {
		await super.show(viewColumn);
	}

	private _readAllSettings(): Record<string, SettingState> {
		const config = getConfig();
		const result: Record<string, SettingState> = {};

		for (const key of MENTOR_SETTING_KEYS) {
			const inspected = config.inspect(key);

			if (inspected) {
				const hasWorkspace = inspected.workspaceValue !== undefined;
				const hasUser = inspected.globalValue !== undefined;

				result[key] = {
					value: config.get(key),
					defaultValue: inspected.defaultValue,
					source: hasWorkspace ? 'workspace' : hasUser ? 'user' : 'default',
				};
			}
		}

		return result;
	}

	private _readEditorSettings(languageId: LanguageId): Record<string, SettingState> {
		const config = vscode.workspace.getConfiguration('editor', { languageId });
		const result: Record<string, SettingState> = {};

		for (const key of EDITOR_SETTING_KEYS) {
			const inspected = config.inspect(key);

			if (inspected) {
				const hasLanguageWorkspace = inspected.workspaceLanguageValue !== undefined;
				const hasLanguageUser = inspected.globalLanguageValue !== undefined;

				result[key] = {
					value: config.get(key),
					defaultValue: inspected.defaultValue,
					source: hasLanguageWorkspace ? 'workspace' : hasLanguageUser ? 'user' : 'default',
				};
			}
		}

		return result;
	}

	private async _updateSetting(key: string, value: unknown, scope: SettingScope): Promise<void> {
		const config = getConfig();

		if (scope === 'default') {
			await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
			await config.update(key, undefined, vscode.ConfigurationTarget.Global);
		} else if (scope === 'workspace') {
			await config.update(key, value, vscode.ConfigurationTarget.Workspace);
		} else {
			await config.update(key, value, vscode.ConfigurationTarget.Global);
		}
	}

	private async _updateEditorSetting(languageId: LanguageId, key: string, value: unknown, scope: SettingScope): Promise<void> {
		const config = vscode.workspace.getConfiguration('editor', { languageId });

		if (scope === 'default') {
			await config.update(key, undefined, vscode.ConfigurationTarget.Workspace, true);
			await config.update(key, undefined, vscode.ConfigurationTarget.Global, true);
		} else if (scope === 'workspace') {
			await config.update(key, value, vscode.ConfigurationTarget.Workspace, true);
		} else {
			await config.update(key, value, vscode.ConfigurationTarget.Global, true);
		}
	}

	protected async onDidReceiveMessage(message: SettingsPanelMessages): Promise<boolean> {
		switch (message.id) {
			case 'GetSettings': {
				this.postMessage({ id: 'GetSettingsResult', settings: this._readAllSettings() });
				return true;
			}
			case 'UpdateSetting': {
				await this._updateSetting(message.key, message.value, message.scope);
				return true;
			}
			case 'GetEditorSettings': {
				this.postMessage({
					id: 'GetEditorSettingsResult',
					languageId: message.languageId,
					settings: this._readEditorSettings(message.languageId),
				});
				return true;
			}
			case 'UpdateEditorSetting': {
				await this._updateEditorSetting(message.languageId, message.key, message.value, message.scope);
				return true;
			}
			case 'GetConnections': {
				const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
				this.postMessage({ id: 'GetConnectionsResult', connections: connectionService.getConnections() });
				return true;
			}
			case 'CreateConnection': {
				const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
				const connection = await connectionService.createConnection();
				const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
				connectionController.edit(connection);
				return true;
			}
			case 'EditConnection': {
				const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
				connectionController.edit(message.connection);
				return true;
			}
			case 'DeleteConnection': {
				const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
				const displayName = message.connection.endpointUrl;
				const answer = await vscode.window.showWarningMessage(
					`Are you sure you want to delete the connection "${displayName}"?`,
					{ modal: true },
					'Delete'
				);

				if (answer === 'Delete') {
					await connectionService.deleteConnection(message.connection.id);
					await connectionService.saveConfiguration();
				}
				return true;
			}
			case 'MoveConnection': {
				const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
				await connectionService.updateConnection({ ...message.connection, configScope: message.toScope });
				await connectionService.saveConfiguration();
				return true;
			}
			case 'TestConnection': {
				const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
				const result = await connectionService.testConnection(message.connection);
				this.postMessage({
					id: 'TestConnectionResult',
					connectionId: message.connection.id,
					success: result === null,
					error: result?.message,
				});
				return true;
			}
			case 'ListGraphs': {
				const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
				const testResult = await connectionService.testConnection(message.connection);
				if (testResult !== null) {
					this.postMessage({
						id: 'TestConnectionResult',
						connectionId: message.connection.id,
						success: false,
						error: testResult.message,
					});
					return true;
				}
				this.postMessage({ id: 'TestConnectionResult', connectionId: message.connection.id, success: true });
				await vscode.commands.executeCommand('mentor.command.listGraphs', message.connection);
				return true;
			}
			case 'OpenInBrowser': {
				await vscode.env.openExternal(vscode.Uri.parse(message.url));
				return true;
			}
			case 'GetVersion': {
				const ctx = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
				const version = (ctx.extension?.packageJSON?.version as string) ?? 'unknown';
				this.postMessage({ id: 'GetVersionResult', version });
				return true;
			}
			default:
				return super.onDidReceiveMessage(message);
		}
	}
}

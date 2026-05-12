import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { WebviewController } from '@src/views/webviews/webview-controller';
import { SparqlConnectionController } from '@src/views/webviews/sparql-connection/sparql-connection-controller';
import { getConfig } from '@src/utilities/vscode/config';
import { SettingsPanelMessages, SettingScope, SettingState, LanguageId } from './settings-panel-messages';
import { SETTINGS } from './settings-metadata';

const EDITOR_SETTING_KEYS = ['tabSize', 'insertSpaces', 'wordWrap', 'formatOnSave'];

const MENTOR_LANGUAGES: LanguageId[] = ['turtle', 'sparql', 'trig', 'n3', 'ntriples', 'nquads'];

type PackageJsonSchema = { properties: Record<string, { title?: string; description?: string }> };

export class SettingsPanelController extends WebviewController<SettingsPanelMessages> {
	private _pendingSection?: string;

	constructor() {
		super({
			componentPath: 'settings-panel.js',
			panelId: 'mentorSettingsPanel',
			panelTitle: 'Mentor Settings',
			panelIcon: 'gear',
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

	// Expose postMessage publicly so the SparqlConnectionController shim can post
	// OpenConnectionForm messages after delegating show() to this controller.
	override postMessage(message: SettingsPanelMessages) {
		super.postMessage(message);
	}

	async show(viewColumn?: vscode.ViewColumn, section?: string): Promise<void> {
		const panelAlreadyOpen = !!this.panel;

		this._pendingSection = section;

		await super.show(viewColumn);

		// If the panel was already open (just revealed), React won't remount and won't
		// re-send GetSettings, so post NavigateTo directly now that the panel is visible.
		if (section && panelAlreadyOpen) {
			this.postMessage({ id: 'NavigateTo', section });
			this._pendingSection = undefined;
		}
		// Otherwise _pendingSection is flushed in the GetSettings handler once React mounts.
	}

	private _readAllSettings(): Record<string, SettingState> {
		const config = getConfig();
		const result: Record<string, SettingState> = {};

		const schema = (vscode.extensions.getExtension('faubulous.mentor')?.packageJSON
			?.contributes?.configuration?.[0] as PackageJsonSchema | undefined)?.properties ?? {};

		for (const key of Object.keys(SETTINGS)) {
			const inspected = config.inspect(key);

			if (inspected) {
				const hasWorkspace = inspected.workspaceValue !== undefined;
				const hasUser = inspected.globalValue !== undefined;
				const def = schema[`mentor.${key}`];

				result[key] = {
					value: config.get(key),
					defaultValue: inspected.defaultValue,
					source: hasWorkspace ? 'workspace' : hasUser ? 'user' : 'default',
					title: def?.title ?? key,
					description: def?.description ?? '',
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
					title: key,
					description: '',
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

				if (this._pendingSection) {
					this.postMessage({ id: 'NavigateTo', section: this._pendingSection });
					this._pendingSection = undefined;
				}

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

				this.postMessage({ id: 'OpenConnectionForm', connection });
				return true;
			}
			case 'EditConnection': {
				this.postMessage({ id: 'OpenConnectionForm', connection: message.connection });
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
				const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
				const version = (context.extension?.packageJSON?.version as string) ?? 'unknown';

				this.postMessage({ id: 'GetVersionResult', version });
				return true;
			}
			case 'GetSparqlConnectionCredential': {
				const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
				const credential = await connectionController.getCredential(message.connectionId);

				this.postMessage({ id: 'GetSparqlConnectionCredentialResult', connectionId: message.connectionId, credential });
				return true;
			}
			case 'SaveSparqlConnection': {
				const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
				await connectionController.saveConnection(message.connection, message.credential);
				return true;
			}
			case 'UpdateSparqlConnection': {
				const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
				await connectionController.updateConnection(message.connection);
				return true;
			}
			case 'TestSparqlConnection': {
				const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
				const result = await connectionController.testConnection(message.connection, message.credential);

				this.postMessage({ id: 'TestSparqlConnectionResult', error: result });
				return true;
			}
			case 'GetInferenceFeatureEnabled': {
				const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
				const value = await connectionController.getInferenceFeatureEnabled();

				this.postMessage({ id: 'GetInferenceFeatureEnabledResult', value });
				return true;
			}
			case 'ToggleSparqlConnectionInference': {
				const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
				const newValue = await connectionController.toggleInference(message.connectionId);

				this.postMessage({ id: 'ToggleSparqlConnectionInferenceResult', connectionId: message.connectionId, inferenceEnabled: newValue });
				return true;
			}
			case 'FetchMicrosoftAuthCredential': {
				const connectionController = container.resolve<SparqlConnectionController>(ServiceToken.SparqlConnectionController);
				const credential = await connectionController.fetchMicrosoftCredential(message.connectionId, message.scopes);

				this.postMessage({ id: 'FetchMicrosoftAuthCredentialResult', connectionId: message.connectionId, credential });
				return true;
			}
			default:
				return super.onDidReceiveMessage(message);
		}
	}
}

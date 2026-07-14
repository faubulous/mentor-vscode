import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionRegistry, ISparqlEndpointTester } from '@src/languages/sparql/services';
import { IGraphManagementService } from '@src/languages/sparql/services';
import { ITripleStoreConfigService } from '@src/languages/sparql/services';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/sparql-connection-registry';
import { IDocumentContextService } from '@src/services/document';
import { ICredentialStorageService } from '@src/services/core';
import { SparqlConnection, SparqlConnectionView } from '@src/languages/sparql/services/sparql-connection';
import { keyToScope } from '@src/utilities/config-scope';
import { SettingsSectionId } from '..';
import { SettingsSectionController } from '../../settings-section-controller';
import { SettingsSectionMessages } from '../../settings-panel-messages';

const SECTION_ID = 'query.connections' satisfies SettingsSectionId;

/**
 * Section controller for the Connections settings section. Owns the full message
 * surface of the SPARQL connection editor and list — create/edit/delete, credential
 * fetching, testing, listing graphs, inference toggle and Microsoft auth — plus the
 * `onDidChangeConnections` event subscription that broadcasts updates to the webview.
 */
export class ConnectionsSectionController implements SettingsSectionController {
	readonly id: SettingsSectionId = SECTION_ID;

	private _post: (message: SettingsSectionMessages) => void = () => { };

	private _disposables: vscode.Disposable[] = [];

	/**
	 * Projects a connection for the webview, attaching its resolved per-connection inference
	 * default. Inference is not stored on the domain object, so it is resolved here at send time.
	 */
	private _toConnectionView(connection: SparqlConnection): SparqlConnectionView {
		const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);

		return { ...connection, inferenceEnabled: connectionRegistry.getInferenceEnabled(connection.id) };
	}

	initialize(post: (message: SettingsSectionMessages) => void): void {
		this._post = post;

		const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
		const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);
		const documentContextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);

		this._disposables.push(
			connectionRegistry.onDidChangeConnections(() => {
				this._post({
					section: SECTION_ID,
					id: 'ConnectionsChanged',
					connections: connectionRegistry.getConnections().map(c => this._toConnectionView(c)),
				});
			}),
			// Mirror graph loading activity (bulk reloads, auto-loads) as a busy
			// indicator on the affected list items, like connection testing.
			graphService.onDidGraphLoadStart(connection => {
				this._post({
					section: SECTION_ID,
					id: 'GraphLoadingChanged',
					connectionId: connection.id,
					loading: true,
				});
			}),
			graphService.onDidGraphLoadEnd(connection => {
				this._post({
					section: SECTION_ID,
					id: 'GraphLoadingChanged',
					connectionId: connection.id,
					loading: false,
				});
			}),
			graphService.onDidChangeGraphs(connectionId => {
				this._post({
					section: SECTION_ID,
					id: 'GraphStatusChanged',
					connectionId,
					status: {
						count: graphService.getGraphsForConnection(connectionId, false).length,
						...(graphService.getGraphLoadError(connectionId) !== undefined
							? { error: graphService.getGraphLoadError(connectionId) }
							: {}),
					},
				});
			}),
			// The workspace store's graphs change as documents are loaded; keep its count live.
			documentContextService.onDidChangeDocumentContext(() => {
				this._post({
					section: SECTION_ID,
					id: 'GraphStatusChanged',
					connectionId: WORKSPACE_CONNECTION.id,
					status: { count: graphService.getWorkspaceGraphs(false).length },
				});
			})
		);
	}

	onActivate(params: Record<string, unknown> | undefined): void {
		const connection = params?.connection as SparqlConnection | undefined;

		if (connection) {
			this._post({ section: SECTION_ID, id: 'EditSparqlConnection', connection: this._toConnectionView(connection) });
		}
	}

	async handleMessage(message: SettingsSectionMessages): Promise<boolean> {
		const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
		const endpointTester = container.resolve<ISparqlEndpointTester>(ServiceToken.SparqlEndpointTester);
		const credentialService = container.resolve<ICredentialStorageService>(ServiceToken.CredentialStorageService);
		const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);

		switch (message.id) {
			case 'GetConnections': {
				this._post({
					section: SECTION_ID,
					id: 'GetConnectionsResult',
					connections: connectionRegistry.getConnections().map(c => this._toConnectionView(c)),
				});

				return true;
			}
			case 'GetGraphStatuses': {
				const statuses: Record<string, { count: number; error?: string }> = {};

				for (const connection of connectionRegistry.getConnections()) {
					const hasGraphs = graphService.hasGraphsForConnection(connection.id);
					const error = graphService.getGraphLoadError(connection.id);

					if (hasGraphs || error !== undefined) {
						statuses[connection.id] = {
							count: graphService.getGraphsForConnection(connection.id, false).length,
							...(error !== undefined ? { error } : {}),
						};
					}
				}

				// The workspace store enumerates its graphs in-process rather than via the graph service.
				statuses[WORKSPACE_CONNECTION.id] = { 
					count: graphService.getWorkspaceGraphs(false).length
				};

				this._post({ section: SECTION_ID, id: 'GetGraphStatusesResult', statuses });

				return true;
			}
			case 'CreateConnection': {
				const connection = await connectionRegistry.createConnection(keyToScope(message.scope));
				this._post({ section: SECTION_ID, id: 'EditSparqlConnection', connection: this._toConnectionView(connection) });

				return true;
			}
			case 'DeleteConnection': {
				const connection = message.connection;
				const answer = await vscode.window.showWarningMessage(
					`Are you sure you want to delete the connection "${connection.endpointUrl}"?`,
					{ modal: true },
					'Delete'
				);

				if (answer === 'Delete') {
					try {
						await connectionRegistry.deleteConnection(connection.id);
					} catch (e) {
						vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
						return true;
					}

					await connectionRegistry.saveConfiguration();
				}

				return true;
			}
			case 'TestConnection': {
				const connection = message.connection;
				const result = await endpointTester.testConnection(connection);

				this._post({
					section: SECTION_ID,
					id: 'TestConnectionResult',
					connectionId: connection.id,
					success: result === null,
					error: result?.message,
				});

				return true;
			}
			case 'ListGraphs': {
				const connection = message.connection;
				const testResult = await endpointTester.testConnection(connection);

				if (testResult !== null) {
					this._post({
						section: SECTION_ID,
						id: 'TestConnectionResult',
						connectionId: connection.id,
						success: false,
						error: testResult.message,
					});

					return true;
				}

				// Post the result only after the graphs have been listed so the item's
				// busy indicator covers the whole operation, not just the test.
				try {
					await vscode.commands.executeCommand('mentor.command.listGraphs', connection);

					this._post({
						section: SECTION_ID,
						id: 'TestConnectionResult',
						connectionId: connection.id,
						success: true,
					});
				} catch (e) {
					this._post({
						section: SECTION_ID,
						id: 'TestConnectionResult',
						connectionId: connection.id,
						success: false,
						error: e instanceof Error ? e.message : String(e),
					});
				}

				return true;
			}
			case 'ReloadGraphs': {
				// Refresh the cached graph list for every configurable connection. The workspace store
				// (protected) enumerates its graphs in-process and is excluded. Each completion fires
				// onDidChangeGraphs, which posts a GraphStatusChanged update to the webview.
				const connections = connectionRegistry.getConnections().filter(c => !c.isProtected);

				await Promise.all(connections.map(c => graphService.loadGraphsForConnection(c)));

				return true;
			}
			case 'OpenInBrowser': {
				await vscode.env.openExternal(vscode.Uri.parse(message.url));

				return true;
			}
			case 'GetSparqlConnectionCredential': {
				const connectionId = message.connectionId;
				const credential = await credentialService.getCredential(connectionId);

				this._post({
					section: SECTION_ID,
					id: 'GetSparqlConnectionCredentialResult',
					connectionId,
					credential,
				});

				return true;
			}
			case 'SaveSparqlConnection': {
				const connection = message.connection;

				try {
					await connectionRegistry.saveConnectionWithCredential(connection, message.credential);
				} catch (e) {
					vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
					return true;
				}

				vscode.window.showInformationMessage('SPARQL connection saved.');

				// If the connection now has auto-loading enabled, kick off a load immediately
				// so the user sees the result without restarting VS Code.
				if (connection.autoLoadGraphs) {
					graphService.loadGraphsForConnection(connection);
				}

				return true;
			}
			case 'DiscardSparqlConnection': {
				const connectionId = message.connectionId;
				const connection = connectionRegistry.getConnection(connectionId);

				if (connection?.isNew) {
					await connectionRegistry.deleteConnection(connectionId);
				}

				return true;
			}
			case 'TestSparqlConnection': {
				const result = await endpointTester.testConnection(message.connection, message.credential);

				this._post({ section: SECTION_ID, id: 'TestSparqlConnectionResult', error: result });

				return true;
			}
			case 'GetStoreTypes': {
				const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
				this._post({
					section: SECTION_ID,
					id: 'GetStoreTypesResult',
					storeConfigs: storeConfigService.getStoreConfigs(),
				});

				return true;
			}
			case 'ToggleSparqlConnectionInference': {
				const connectionId = message.connectionId;
				const inferenceEnabled = await connectionRegistry.toggleInferenceEnabled(connectionId);

				this._post({
					section: SECTION_ID,
					id: 'ToggleSparqlConnectionInferenceResult',
					connectionId,
					inferenceEnabled,
				});

				return true;
			}
			case 'FetchMicrosoftAuthCredential': {
				const connectionId = message.connectionId;
				const credential = await credentialService.fetchMicrosoftCredential(message.scopes);

				this._post({
					section: SECTION_ID,
					id: 'FetchMicrosoftAuthCredentialResult',
					connectionId,
					credential,
				});

				return true;
			}
			default: {
				return false;
			}
		}
	}

	dispose(): void {
		for (const d of this._disposables) {
			d.dispose();
		}
		
		this._disposables = [];
	}
}

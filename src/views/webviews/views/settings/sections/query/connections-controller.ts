import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { IGraphManagementService } from '@src/languages/sparql/services';
import { ITripleStoreConfigService } from '@src/languages/sparql/services';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/sparql-connection-service';
import { IDocumentContextService } from '@src/services/document';
import { ICredentialStorageService } from '@src/services/core';
import { SparqlConnection, SparqlConnectionView } from '@src/languages/sparql/services/sparql-connection';
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
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);

		return { ...connection, inferenceEnabled: connectionService.getInferenceEnabled(connection.id) };
	}

	initialize(post: (message: SettingsSectionMessages) => void): void {
		this._post = post;

		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);
		const documentContextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);

		this._disposables.push(
			connectionService.onDidChangeConnections(() => {
				this._post({
					section: SECTION_ID,
					id: 'ConnectionsChanged',
					connections: connectionService.getConnections().map(c => this._toConnectionView(c)),
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
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const credentialService = container.resolve<ICredentialStorageService>(ServiceToken.CredentialStorageService);
		const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);

		switch (message.id) {
			case 'GetConnections': {
				this._post({
					section: SECTION_ID,
					id: 'GetConnectionsResult',
					connections: connectionService.getConnections().map(c => this._toConnectionView(c)),
				});

				return true;
			}
			case 'GetGraphStatuses': {
				const statuses: Record<string, { count: number; error?: string }> = {};

				for (const connection of connectionService.getConnections()) {
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
				const connection = await connectionService.createConnection();
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
					await connectionService.deleteConnection(connection.id);
					await connectionService.saveConfiguration();
				}

				return true;
			}
			case 'TestConnection': {
				const connection = message.connection;
				const result = await connectionService.testConnection(connection);

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
				const testResult = await connectionService.testConnection(connection);

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

				this._post({
					section: SECTION_ID,
					id: 'TestConnectionResult',
					connectionId: connection.id,
					success: true,
				});

				await vscode.commands.executeCommand('mentor.command.listGraphs', connection);

				return true;
			}
			case 'ReloadGraphs': {
				// Refresh the cached graph list for every configurable connection. The workspace store
				// (protected) enumerates its graphs in-process and is excluded. Each completion fires
				// onDidChangeGraphs, which posts a GraphStatusChanged update to the webview.
				const connections = connectionService.getConnections().filter(c => !c.isProtected);

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

				await connectionService.saveConnectionWithCredential(connection, message.credential);

				// If the connection now has auto-loading enabled, kick off a load immediately
				// so the user sees the result without restarting VS Code.
				if (connection.autoLoadGraphs) {
					graphService.loadGraphsForConnection(connection);
				}

				return true;
			}
			case 'DiscardSparqlConnection': {
				const connectionId = message.connectionId;
				const connection = connectionService.getConnection(connectionId);

				if (connection?.isNew) {
					await connectionService.deleteConnection(connectionId);
				}

				return true;
			}
			case 'TestSparqlConnection': {
				const result = await connectionService.testConnection(message.connection, message.credential);

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
				const inferenceEnabled = await connectionService.toggleInferenceEnabled(connectionId);

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

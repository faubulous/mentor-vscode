import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { mentor } from '@src/mentor';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { AuthCredential } from './credential';
import { SparqlConnection } from './sparql-connection';
import { SparqlConnectionSource, ComunicaSource } from './sparql-query-source';

const CONNECTIONS_CONFIG_KEY = 'sparql.connections';

/**
 * The non-removable workspace triple store.
 */
export const MENTOR_WORKSPACE_STORE: SparqlConnection = {
	id: 'workspace',
	endpointUrl: 'workspace:',
	configScope: ConfigurationScope.Workspace,
	isProtected: true
};

/**
 * Service for managing connections to SPARQL endpoints.
 */
export class SparqlConnectionService {

	private _connections: SparqlConnection[] = [];

	private _onDidChangeConnections = new vscode.EventEmitter<void>();

	public readonly onDidChangeConnections = this._onDidChangeConnections.event;

	private _onDidChangeConnectionForDocument = new vscode.EventEmitter<vscode.Uri>();

	public readonly onDidChangeConnectionForDocument = this._onDidChangeConnectionForDocument.event;

	private _defaultEndpointUrl = 'https://';

	private _defaultConfigScope: ConfigurationScope = ConfigurationScope.User;

	/**
	 * Loads connections from the various configuration storage locactions into memory.
	 */
	initialize() {
		this.loadConfiguration();
	}

	/**
	 * Loads connections from the various configuration storage locactions into memory.
	 */
	loadConfiguration(): void {
		this._connections = [MENTOR_WORKSPACE_STORE];
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.Global));
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.Workspace));

		this._onDidChangeConnections.fire();
	}

	/**
	 * Gets the configuration scope from a Visual Studio configuration target.
	 * @param configTarget A Visual Studio configuration target.
	 * @returns The corresponding configuration scope.
	 */
	private _getConfigurationScopeFromTarget(configTarget: vscode.ConfigurationTarget): ConfigurationScope {
		if (configTarget === vscode.ConfigurationTarget.Workspace) {
			return ConfigurationScope.Workspace;
		} else {
			return ConfigurationScope.User;
		}
	}

	/**
	 * Helper method to read connections from a specific configuration scope.
	 * @param configTarget The configuration target to read from.
	 * @returns An array of SPARQL connections.
	 */
	private _loadConnectionsFromConfiguration(configTarget: vscode.ConfigurationTarget): SparqlConnection[] {
		const inspect = mentor.configuration.inspect<SparqlConnection[]>(CONNECTIONS_CONFIG_KEY);

		if (inspect) {
			const connections = [];

			if (configTarget === vscode.ConfigurationTarget.Global && inspect.globalValue) {
				connections.push(...inspect.globalValue);
			}

			if (configTarget === vscode.ConfigurationTarget.Workspace && inspect.workspaceValue) {
				connections.push(...inspect.workspaceValue);
			}

			return connections.map(c => ({
				...c,
				configScope: this._getConfigurationScopeFromTarget(configTarget),
			}));
		} else {
			return [];
		}
	}

	private _getEndpointDataForConfigScope(configScope: ConfigurationScope) {
		return this._connections
			.filter(c => c.configScope === configScope && c.id !== MENTOR_WORKSPACE_STORE.id)
			.map(c => ({
				id: c.id,
				endpointUrl: c.endpointUrl
			}));
	}

	/**
	 * Persists the in-memory connections to configuration.
	 */
	async saveConfiguration(): Promise<void> {
		const globalConnections = this._getEndpointDataForConfigScope(ConfigurationScope.User);
		const workspaceConnections = this._getEndpointDataForConfigScope(ConfigurationScope.Workspace);

		await mentor.configuration.update(CONNECTIONS_CONFIG_KEY, globalConnections, vscode.ConfigurationTarget.Global);
		await mentor.configuration.update(CONNECTIONS_CONFIG_KEY, workspaceConnections, vscode.ConfigurationTarget.Workspace);

		for (const connection of this._connections) {
			connection.isNew = false;
			connection.isModified = false;
		}

		this._onDidChangeConnections.fire();
	}

	/**
	 * Get the configuration targets supported for storing SPARQL connections.
	 * @remarks The Workspace Folder target is not supported because it would require
	 *          to select a specific workspace folder when creating a new connection.
	 * @returns An array of supported configuration scopes.
	 */
	getSupportedConfigurationScopes(): ConfigurationScope[] {
		return [
			ConfigurationScope.User,
			ConfigurationScope.Workspace
		];
	}

	/**
	 * Retrieves all available SPARQL endpoints, including the internal store.
	 * @returns A promise that resolves to an array of all connections.
	 */
	getConnections(): SparqlConnection[] {
		return this._connections;
	}

	/**
	 * Retrieves all SPARQL connections for a specific configuration scope.
	 * @param configScope The configuration scope to filter connections by.
	 * @returns An array of SPARQL connections for the specified configuration scope.
	 */
	getConnectionsForConfigurationScope(configScope: ConfigurationScope): SparqlConnection[] {
		return this._connections.filter(c => c.configScope === configScope);
	}

	/**
	 * Retrieves a SPARQL connection by its ID.
	 * @param connectionId The ID of the connection to retrieve.
	 * @returns The SPARQL connection or `undefined` if not found.
	 */
	getConnection(connectionId: string): SparqlConnection | undefined {
		return this._connections.find(c => c.id === connectionId);
	}

	/**
	 * Get the configured SPARQL connection for a specific document (TextDocument or NotebookCell).
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The SPARQL connection or the Mentor Workspace triple store if no connection is found.
	 */
	getConnectionForDocument(documentUri: vscode.Uri): SparqlConnection {
		let connectionId;

		if (documentUri.scheme === 'vscode-notebook-cell') {
			connectionId = this._getConnectionIdForCell(documentUri);
		} else {
			connectionId = this._getConnectionIdForDocument(documentUri);
		}

		const connection = this.getConnection(connectionId ?? '');

		return connection ?? MENTOR_WORKSPACE_STORE;
	}

	/**
	 * Get a connection ID for a notebook cell, either by checking its own metadata or 
	 * by inheriting from previous cells.
	 * @param cellUri The URI of the notebook cell.
	 * @returns The inherited connection ID, or `undefined` if none is set.
	 */
	private _getConnectionIdForCell(cellUri: vscode.Uri): string | undefined {
		const notebook = this._getNotebookFromCellUri(cellUri);

		if (notebook) {
			const cells = notebook.getCells();
			const cellIndex = cells.findIndex(cell => cell.document.uri.toString() === cellUri.toString());

			if (cellIndex > -1) {
				for (let i = cellIndex; i >= 0; i--) {
					const cell = cells[i];
					const connectionId = cell.metadata?.connectionId;

					if (typeof connectionId === 'string') {
						return connectionId;
					}
				}
			}
		}
	}

	/**
	 * Get the storage key in the workspace or global storage for a specific document.
	 * @param documentUri The URI of the document.
	 * @returns The storage key.
	 */
	private _getConnectionStorageKeyForDocument(documentUri: vscode.Uri): string {
		return `sparql.connection:${documentUri.toString()}`;
	}

	/**
	 * Get a connection ID for a text document.
	 * @param documentUri The URI of the document.
	 * @returns The connection ID, or `undefined` if none is set.
	 */
	private _getConnectionIdForDocument(documentUri: vscode.Uri): string | undefined {
		const key = this._getConnectionStorageKeyForDocument(documentUri);

		return mentor.workspaceStorage.getValue(key, undefined);
	}

	/**
	 * Sets the SPARQL connection for a specific document (TextDocument or NotebookCell).
	 * @param documentUri The URI of the document or notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	async setQuerySourceForDocument(documentUri: vscode.Uri, connectionId: string): Promise<void> {
		if (documentUri.scheme === 'vscode-notebook-cell') {
			await this.setConnectionForCell(documentUri, connectionId);
		} else {
			const key = this._getConnectionStorageKeyForDocument(documentUri);

			mentor.workspaceStorage.setValue(key, connectionId);
		}

		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	/**
	 * Retrieves the SPARQL connection for a specific endpoint URL.
	 * @param endpointUrl The URL of the SPARQL endpoint.
	 * @returns The SPARQL connection or `undefined` if not found.
	 */
	getConnectionForEndpoint(endpointUrl: string): SparqlConnection | undefined {
		return this._connections.find(c => c.endpointUrl === endpointUrl);
	}

	/**
	 * Gets the Comunica-compatible query source for a given document (TextDocument or NotebookCell).
	 * For notebooks, it inherits the connection from the previous cell.
	 * Otherwise, it defaults to the Mentor Workspace Store.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to a ComunicaSource configuration.
	 */
	async getQuerySourceForDocument(documentUri: vscode.Uri): Promise<ComunicaSource> {
		const connection = this.getConnectionForDocument(documentUri);

		if (connection.id === MENTOR_WORKSPACE_STORE.id) {
			return {
				type: 'rdfjs',
				value: mentor.store,
			};
		} else {
			const source: SparqlConnectionSource = {
				type: 'sparql',
				value: connection.endpointUrl,
				connection: connection,
			};

			return source;
		}
	}

	/**
	 * Sets the connection for a specific notebook cell by editing its metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	async setConnectionForCell(cellUri: vscode.Uri, connectionId: string): Promise<void> {
		const notebook = this._getNotebookFromCellUri(cellUri);

		if (!notebook) {
			throw new Error('Notebook document not found for the given cell URI: ' + cellUri.toString());
		}

		const cell = notebook.getCells().find(cell => cell.document.uri === cellUri);

		if (!cell) {
			throw new Error('Cell not found in the notebook for the given cell URI: ' + cellUri.toString());
		}

		const metadata = { ...cell.metadata, connectionId: connectionId };
		const notebookEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, metadata);

		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.set(notebook.uri, [notebookEdit]);

		await vscode.workspace.applyEdit(workspaceEdit);
	}

	/**
	 * Finds the containing NotebookDocument for a given cell URI.
	 */
	private _getNotebookFromCellUri(cellUri: vscode.Uri): vscode.NotebookDocument | undefined {
		for (const notebook of vscode.workspace.notebookDocuments) {
			if (notebook.uri.path === cellUri.path) {
				return notebook;
			}
		}
	}

	/**
	 * Adds a new SPARQL connection and stores it in the specified settings scope.
	 * @param label A user-friendly name for the connection.
	 * @param endpointUrl The URL of the SPARQL endpoint.
	 * @param scope Where to save the connection ('project' or 'user').
	 * @param credentials Optional credentials for the connection.
	 */
	async createConnection(): Promise<SparqlConnection> {
		const connection: SparqlConnection = {
			id: uuidv4(),
			isNew: true,
			isModified: false,
			endpointUrl: this._defaultEndpointUrl,
			configScope: this._defaultConfigScope,
		};

		this._connections.push(connection);
		this._onDidChangeConnections.fire();

		return connection;
	}

	/**
	 * Updates an existing SPARQL connection.
	 * @param connection The connection to update.
	 */
	async updateEndpoint(connection: SparqlConnection): Promise<void> {
		if (connection.id === MENTOR_WORKSPACE_STORE.id) {
			vscode.window.showErrorMessage('The Mentor Workspace Store cannot be modified.');
			return;
		}

		const i = this._connections.findIndex(c => c.id === connection.id);

		if (i === -1) {
			this._connections.push(connection);
		} else {
			this._connections[i] = connection;
		}

		this._onDidChangeConnections.fire();
	}

	/**
	 * Deletes a SPARQL connection from the settings.
	 * @param connectionId The ID of the connection to delete.
	 */
	async deleteConnection(connectionId: string): Promise<void> {
		if (connectionId === MENTOR_WORKSPACE_STORE.id) {
			vscode.window.showErrorMessage('The Mentor Workspace Store cannot be removed.');
			return;
		}

		this._connections = this._connections.filter(c => c.id !== connectionId);

		this._onDidChangeConnections.fire();
	}

	/**
	 * Tests if a connection with a SPARQL endpoint can be established using a direct HTTP POST.
	 * @param connection The SPARQL endpoint connection to test.
	 * @param credential If provided, uses these credentials instead of fetching stored ones.
	 * @returns `null` if the connection is successful, or an error object { code, message } otherwise.
	 */
	async testConnection(connection: SparqlConnection, credential?: AuthCredential | null): Promise<null | { code: number; message: string }> {
		// Workspace store is always available - no need to test
		if (connection.id === 'workspace') {
			return null;
		}

		try {
			const headers: Record<string, string> = {
				'Content-Type': 'application/sparql-query',
				'Accept': 'application/sparql-results+json,application/json'
			};

			if (credential === undefined) {
				credential = await mentor.credentialStorageService.getCredential(connection.id);
			}

			const authHeaders = await this.getAuthHeaders(credential as AuthCredential);

			if (authHeaders) {
				Object.assign(headers, authHeaders);
			}

			const response = await fetch(connection.endpointUrl, {
				method: 'POST',
				headers,
				body: 'ASK WHERE { ?s ?p ?o }'
			});

			if (response.ok) {
				return null;
			} else {
				const text = await response.text();

				return {
					code: response.status,
					message: text || response.statusText
				};
			}
		} catch (error: any) {
			return {
				code: error.status || error.code || 0,
				message: error.message || String(error)
			};
		}
	}

	/**
	 * Returns HTTP Authorization headers for the given URI.
	 */
	async getAuthHeaders(credential?: AuthCredential): Promise<Record<string, string>> {
		const headers: Record<string, string> = {};

		if (credential?.type === 'basic') {
			const encoded = btoa(`${credential.username}:${credential.password}`);

			headers.Authorization = `Basic ${encoded}`;
		}

		if (credential?.type === 'bearer') {
			headers.Authorization = `Bearer ${credential.token}`;
		}

		if (credential?.type === 'microsoft') {
			headers.Authorization = `Bearer ${credential.accessToken}`;
		}

		console.log('Auth headers:', credential, headers);

		return headers;
	}
}
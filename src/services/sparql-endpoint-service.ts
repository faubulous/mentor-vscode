import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { v4 as uuidv4 } from 'uuid';
import { Credential } from './credential-storage-service';
import { ComunicaSource, SparqlEndpointSource } from './sparql-query-source';
import { SparqlEndpoint } from './sparql-endpoint';

const CONNECTIONS_CONFIG_KEY = 'sparql.connections';

/**
 * The non-removable workspace triple store.
 */
export const MENTOR_WORKSPACE_STORE: SparqlEndpoint = {
	id: 'workspace',
	endpointUrl: 'workspace://',
	configTarget: vscode.ConfigurationTarget.Global,
	isProtected: true
};

/**
 * Service for managing connections to SPARQL endpoints.
 */
export class SparqlEndpointService {

	private _connections: SparqlEndpoint[] = [];

	private _onDidChangeConnections = new vscode.EventEmitter<void>();

	public readonly onDidChangeConnections = this._onDidChangeConnections.event;

	private _onDidChangeConnectionForDocument = new vscode.EventEmitter<vscode.Uri>();

	public readonly onDidChangeConnectionForDocument = this._onDidChangeConnectionForDocument.event;

	private _defaultEndpointUrl = 'https://';

	private _defaultConfigTarget: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace;

	/**
	 * Loads connections from the various configuration storage locactions into memory.
	 */
	public initialize() {
		this.loadConfiguration();
	}

	/**
	 * Loads connections from the various configuration storage locactions into memory.
	 */
	public loadConfiguration(): void {
		this._connections = [MENTOR_WORKSPACE_STORE];
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.Global));
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.WorkspaceFolder));

		this._onDidChangeConnections.fire();
	}

	/**
	 * Helper method to read connections from a specific configuration scope.
	 * @param configTarget The configuration target to read from.
	 * @returns An array of SPARQL connections.
	 */
	private _loadConnectionsFromConfiguration(configTarget: vscode.ConfigurationTarget): SparqlEndpoint[] {
		const inspect = mentor.configuration.inspect<SparqlEndpoint[]>(CONNECTIONS_CONFIG_KEY);

		if (inspect) {
			const connections = [];

			if (configTarget === vscode.ConfigurationTarget.Global && inspect.globalValue) {
				connections.push(...inspect.globalValue);
			}

			if (configTarget === vscode.ConfigurationTarget.Workspace && inspect.workspaceValue) {
				connections.push(...inspect.workspaceValue);
			}

			if (configTarget === vscode.ConfigurationTarget.WorkspaceFolder && inspect.workspaceFolderValue) {
				connections.push(...inspect.workspaceFolderValue);
			}

			return connections.map(c => ({ ...c, configTarget: configTarget }));
		} else {
			return [];
		}
	}

	/**
	 * Persists the in-memory connections to configuration.
	 */
	public async saveConfiguration(): Promise<void> {
		const globalConnections = this._connections.filter(c => c.configTarget === vscode.ConfigurationTarget.Global && c.id !== MENTOR_WORKSPACE_STORE.id);
		const workspaceConnections = this._connections.filter(c => c.configTarget === vscode.ConfigurationTarget.Workspace && c.id !== MENTOR_WORKSPACE_STORE.id);
		// const workspaceFolderConnections = this._connections.filter(c => c.configTarget === vscode.ConfigurationTarget.WorkspaceFolder && c.id !== MENTOR_WORKSPACE_STORE.id);

		await mentor.configuration.update(CONNECTIONS_CONFIG_KEY, globalConnections, vscode.ConfigurationTarget.Global);
		await mentor.configuration.update(CONNECTIONS_CONFIG_KEY, workspaceConnections, vscode.ConfigurationTarget.Workspace);
		// await mentor.configuration.update(CONNECTIONS_CONFIG_KEY, workspaceFolderConnections, vscode.ConfigurationTarget.WorkspaceFolder);

		this._onDidChangeConnections.fire();
	}

	/**
	 * Retrieves all available SPARQL endpoints, including the internal store.
	 * @returns A promise that resolves to an array of all connections.
	 */
	public getConnections(): SparqlEndpoint[] {
		return this._connections;
	}

	public getConnection(id: string): SparqlEndpoint | undefined {
		return this._connections.find(c => c.id === id);
	}

	/**
	 * Get the configured SPARQL connection for a specific document (TextDocument or NotebookCell).
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The SPARQL connection or the Mentor Workspace triple store if no connection is found.
	 */
	public getConnectionForDocument(documentUri: vscode.Uri): SparqlEndpoint {
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

	private _getConnectionIdForDocument(documentUri: vscode.Uri): string | undefined {
		const key = this._getConnectionStorageKeyForDocument(documentUri);

		return mentor.workspaceStorage.getValue(key, undefined);
	}

	private _getConnectionStorageKeyForDocument(documentUri: vscode.Uri): string {
		return `sparql.connection:${documentUri.toString()}`;
	}

	/**
	 * Sets the SPARQL connection for a specific document (TextDocument or NotebookCell).
	 * @param documentUri The URI of the document or notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	public async setQuerySourceForDocument(documentUri: vscode.Uri, connectionId: string): Promise<void> {
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
	public getConnectionForEndpoint(endpointUrl: string): SparqlEndpoint | undefined {
		return this._connections.find(c => c.endpointUrl === endpointUrl);
	}

	/**
	 * Gets the Comunica-compatible query source for a given document (TextDocument or NotebookCell).
	 * For notebooks, it inherits the connection from the previous cell.
	 * Otherwise, it defaults to the Mentor Workspace Store.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to a ComunicaSource configuration.
	 */
	public async getQuerySourceForDocument(documentUri: vscode.Uri): Promise<ComunicaSource> {
		const connection = this.getConnectionForDocument(documentUri);

		if (connection.id === MENTOR_WORKSPACE_STORE.id) {
			return {
				type: 'rdfjs',
				value: mentor.store,
			};
		} else {
			const source: SparqlEndpointSource = {
				type: 'sparql',
				value: connection.endpointUrl,
			};

			const credential = await mentor.credentialStorageService.getCredential(connection.endpointUrl);

			source.headers = this.getAuthHeaders(credential);

			return source;
		}
	}

	/**
	 * Sets the connection for a specific notebook cell by editing its metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	public async setConnectionForCell(cellUri: vscode.Uri, connectionId: string): Promise<void> {
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
		const notebookUri = cellUri.with({ scheme: 'file', fragment: '' }).toString();

		return vscode.workspace.notebookDocuments.find(doc => doc.uri.toString() === notebookUri);
	}

	/**
	 * Adds a new SPARQL connection and stores it in the specified settings scope.
	 * @param label A user-friendly name for the connection.
	 * @param endpointUrl The URL of the SPARQL endpoint.
	 * @param scope Where to save the connection ('project' or 'user').
	 * @param credentials Optional credentials for the connection.
	 */
	public async createEndpoint(): Promise<SparqlEndpoint> {
		const connection: SparqlEndpoint = {
			id: uuidv4(),
			isNew: true,
			isModified: false,
			endpointUrl: this._defaultEndpointUrl,
			configTarget: this._defaultConfigTarget,
		};

		this._connections.push(connection);

		this._onDidChangeConnections.fire();

		return connection;
	}

	/**
	 * Updates an existing SPARQL connection.
	 * @param connection The connection to update.
	 */
	public async updateEndpoint(connection: SparqlEndpoint): Promise<void> {
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
	public async deleteEndpoint(configTarget: vscode.ConfigurationTarget, connectionId: string): Promise<void> {
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
	async testConnection(connection: SparqlEndpoint, credential?: Credential | null): Promise<null | { code: number; message: string }> {
		try {
			const headers: Record<string, string> = {
				'Content-Type': 'application/sparql-query',
				'Accept': 'application/sparql-results+json,application/json'
			};

			if (credential === undefined) {
				credential = await mentor.credentialStorageService.getCredential(connection.endpointUrl);
			}

			const authHeaders = this.getAuthHeaders(credential as Credential);

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
	getAuthHeaders(credential?: Credential): Record<string, string> {
		const headers: Record<string, string> = {};

		if (credential?.type === 'basic') {
			const encoded = btoa(`${credential.username}:${credential.password}`);

			headers.Authorization = `Basic ${encoded}`;
		}

		if (credential?.type === 'bearer') {
			headers.Authorization = `Bearer ${credential.token}`;
		}

		return headers;
	}
}
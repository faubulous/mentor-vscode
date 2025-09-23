import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { QueryEngine } from '@comunica/query-sparql';
import { v4 as uuidv4 } from 'uuid';
import { ComunicaSource, SparqlEndpointSource } from './sparql-query-source';
import { SparqlConnection, SparqlConnectionScope } from './sparql-connection';
import { Credential } from './credential-storage-service';

const MENTOR_CONFIG_KEY = 'mentor';

const CONNECTIONS_CONFIG_KEY = 'sparql.connections';

/**
 * The non-removable workspace triple store.
 */
export const MENTOR_WORKSPACE_STORE: SparqlConnection = {
	id: 'mentor-workspace-store',
	endpointUrl: 'workspace://',
	scope: 'global',
};

/**
 * Service for managing connections to SPARQL endpoints.
 */
export class SparqlConnectionService {
	private _onDidChangeConnections = new vscode.EventEmitter<void>();

	public readonly onDidChangeConnections = this._onDidChangeConnections.event;

	private _onDidChangeConnectionForDocument = new vscode.EventEmitter<vscode.Uri>();

	public readonly onDidChangeConnectionForDocument = this._onDidChangeConnectionForDocument.event;

	/**
	 * Helper method to read connections from a specific configuration scope.
	 */
	private _getConnectionsFromScope(scope: SparqlConnectionScope): SparqlConnection[] {
		const config = vscode.workspace.getConfiguration(MENTOR_CONFIG_KEY);
		const inspect = config.inspect<SparqlConnection[]>(CONNECTIONS_CONFIG_KEY);

		const connections = (scope === 'repository' ? inspect?.workspaceFolderValue : inspect?.globalValue) || [];

		return connections.map(c => ({ ...c, scope }));
	}

	/**
	 * Retrieves all available SPARQL endpoints, including the internal store.
	 * @returns A promise that resolves to an array of all connections.
	 */
	public async getConnections(): Promise<SparqlConnection[]> {
		// Note: The internal store is always first and is the default.
		return [
			MENTOR_WORKSPACE_STORE,
			...this._getConnectionsFromScope('global'),
			...this._getConnectionsFromScope('repository'),
		];
	}

	/**
	 * Get the configured SPARQL connection for a specific document (TextDocument or NotebookCell).
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The SPARQL connection or the Mentor Workspace triple store if no connection is found.
	 */
	public async getConnectionForDocument(documentUri: vscode.Uri): Promise<SparqlConnection> {
		let connectionId;

		if (documentUri.scheme === 'vscode-notebook-cell') {
			connectionId = this._getConnectionIdForCell(documentUri);
		} else {
			connectionId = this._getConnectionIdForDocument(documentUri);
		}

		const connections = await this.getConnections();

		return connections.find(c => c.id === connectionId) ?? MENTOR_WORKSPACE_STORE;
	}

	private _getConnectionIdForDocument(documentUri: vscode.Uri): string | undefined {
		return mentor.workspaceStorage.getValue(`sparql.connection:${documentUri.toString()}`, undefined);
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
			mentor.workspaceStorage.setValue(`sparql.connection:${documentUri.toString()}`, connectionId);
		}

		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	/**
	 * Retrieves the SPARQL connection for a specific endpoint URL.
	 * @param endpointUrl The URL of the SPARQL endpoint.
	 * @returns The SPARQL connection or `undefined` if not found.
	 */
	public async getConnectionForEndpoint(endpointUrl: string): Promise<SparqlConnection | undefined> {
		const connections = await this.getConnections();

		return connections.find(c => c.endpointUrl === endpointUrl);
	}

	/**
	 * Gets the Comunica-compatible query source for a given document (TextDocument or NotebookCell).
	 * For notebooks, it inherits the connection from the previous cell.
	 * Otherwise, it defaults to the Mentor Workspace Store.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to a ComunicaSource configuration.
	 */
	public async getQuerySourceForDocument(documentUri: vscode.Uri): Promise<ComunicaSource> {
		const connection = await this.getConnectionForDocument(documentUri);

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

			console.debug(documentUri.toString(), connection);

			const credential = await mentor.credentialStorageService.getCredential(connection.endpointUrl);

			if (credential) {
				source.headers = this.getAuthHeaders(credential);
			}

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

					console.debug(cell.metadata);

					if (typeof connectionId === 'string') {
						return connectionId;
					}
				}
			}
		}
	}

	/**
	 * Finds the containing NotebookDocument for a given cell URI.
	 */
	private _getNotebookFromCellUri(cellUri: vscode.Uri): vscode.NotebookDocument | undefined {
		const notebookUri = cellUri.with({ scheme: 'file', fragment: '' }).toString();

		return vscode.workspace.notebookDocuments.find(doc => doc.uri.toString() === notebookUri);
	}

	/**
	 * Sets the SPARQL connections for a specific scope.
	 * @param scope The scope in which to set the connections.
	 * @param connections The array of SPARQL connections to set.
	 */
	private async _setConnectionsForScope(scope: SparqlConnectionScope, connections: SparqlConnection[]): Promise<void> {
		const config = vscode.workspace.getConfiguration(MENTOR_CONFIG_KEY);
		const target = scope === 'repository' ?
			vscode.ConfigurationTarget.WorkspaceFolder :
			vscode.ConfigurationTarget.Global;

		await config.update(CONNECTIONS_CONFIG_KEY, connections, target);
	}

	/**
	 * Adds a new SPARQL connection and stores it in the specified settings scope.
	 * @param label A user-friendly name for the connection.
	 * @param endpointUrl The URL of the SPARQL endpoint.
	 * @param scope Where to save the connection ('project' or 'user').
	 * @param credentials Optional credentials for the connection.
	 */
	public async createConnection(scope: SparqlConnectionScope, endpointUrl: string, label?: string): Promise<void> {
		const connections = this._getConnectionsFromScope(scope);

		if (connections.find(c => c.endpointUrl === endpointUrl)) {
			vscode.window.showErrorMessage(`A connection for the endpoint ${endpointUrl} already exists.`);
			return;
		}

		const connection = { id: uuidv4(), endpointUrl, scope, label: label ?? endpointUrl };

		await this._setConnectionsForScope(scope, [...connections, connection]);

		this._onDidChangeConnections.fire();
	}

	/**
	 * Updates an existing SPARQL connection.
	 * @param connection The connection to update.
	 */
	public async updateConnection(connection: SparqlConnection): Promise<void> {
		if (connection.id === MENTOR_WORKSPACE_STORE.id) {
			vscode.window.showErrorMessage('The Mentor Workspace Store cannot be modified.');
			return;
		}

		const connections = this._getConnectionsFromScope(connection.scope);

		if (connections.findIndex(c => c.id === connection.id) === -1) {
			vscode.window.showErrorMessage('The connection to update was not found.');
			return;
		}

		await this._setConnectionsForScope(connection.scope, [
			...connections.filter(c => c.id !== connection.id),
			connection
		]);

		this._onDidChangeConnections.fire();
	}

	/**
	 * Deletes a SPARQL connection from the settings.
	 * @param connectionId The ID of the connection to delete.
	 */
	public async deleteConnection(scope: SparqlConnectionScope, connectionId: string): Promise<void> {
		if (connectionId === MENTOR_WORKSPACE_STORE.id) {
			vscode.window.showErrorMessage('The Mentor Workspace Store cannot be removed.');
			return;
		}

		const connections = this._getConnectionsFromScope(scope);

		await this._setConnectionsForScope(scope, connections.filter(c => c.id !== connectionId));

		this._onDidChangeConnections.fire();
	}

	/**
	 * Tests if a connection with a SPARQL endpoint can be established.
	 * @param connection The SPARQL endpoint connection to test.
	 * @param credential If provided, uses these credentials instead of fetching stored ones.
	 * @returns `true` if the connection is successful, `false` otherwise.
	 */
	async testConnection(connection: SparqlConnection, credential?: Credential | null): Promise<boolean> {
		try {
			const source: SparqlEndpointSource = {
				type: 'sparql',
				value: connection.endpointUrl,
			};

			if (credential === undefined) {
				credential = await mentor.credentialStorageService.getCredential(connection.endpointUrl);
			}

			if (credential) {
				source.headers = this.getAuthHeaders(credential);
			}

			const query = await new QueryEngine().query('ASK { ?s ?p ?o }', { sources: [source] });

			await query.execute();

			return true;
		} catch (error: any) {
			console.error(error);

			let errorMessage = `Connection test failed: ${error.message}`;

			// Check for HTTP status code in various ways Comunica might expose it
			if (error.status || error.statusCode || error.code) {
				const statusCode = error.status || error.statusCode || error.code;
				errorMessage = `Connection test failed (HTTP ${statusCode}): ${error.message}`;
			}

			// Check if it's a fetch-related error with response
			if (error.response && error.response.status) {
				errorMessage = `Connection test failed (HTTP ${error.response.status}): ${error.message}`;
			}

			// Check for nested errors that might contain status codes
			if (error.cause && (error.cause.status || error.cause.statusCode)) {
				const statusCode = error.cause.status || error.cause.statusCode;
				errorMessage = `Connection test failed (HTTP ${statusCode}): ${error.message}`;
			}

			vscode.window.showErrorMessage(errorMessage);

			return false;
		}
	}

	/**
	 * Returns HTTP Authorization headers for the given URI.
	 */
	getAuthHeaders(credential: Credential): { [key: string]: string } | undefined {
		if (credential.type === 'basic') {
			const encoded = btoa(`${credential.username}:${credential.password}`);

			return { Authorization: `Basic ${encoded}` };
		}

		if (credential.type === 'bearer') {
			return { Authorization: `Bearer ${credential.token}` };
		}

		return undefined;
	}
}
import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { ComunicaSource, SparqlEndpointSource } from './sparql-query-source';
import { SparqlConnection, SparqlConnectionCredentials, SparqlConnectionScope } from './sparql-connection';
import { SparqlConnectionFactory } from './sparql-connection-factory';

const MENTOR_CONFIG_KEY = 'mentor';

const CONNECTIONS_CONFIG_KEY = 'sparql.connections';

const SECRET_STORAGE_KEY_PREFIX = 'mentor.sparql.connection:';

/**
 * The non-removable workspace triple store.
 */
export const MENTOR_WORKSPACE_STORE: SparqlConnection = {
	id: 'mentor-workspace-store',
	label: 'Mentor Workspace',
	endpoint: 'mentor://workspace',
	scope: 'workspace',
};

/**
 * Service for managing connections to SPARQL endpoints.
 */
export class SparqlConnectionService {
	private _initialized = false;

	private _secretStorage?: vscode.SecretStorage;

	private _connectionFactory?: SparqlConnectionFactory;

	private _onDidChangeConnections = new vscode.EventEmitter<void>();

	public readonly onDidChangeConnections = this._onDidChangeConnections.event;

	public initialize(context: vscode.ExtensionContext) {
		if (this._initialized) {
			return;
		}

		this._initialized = true;
		this._secretStorage = context.secrets;
		this._connectionFactory = new SparqlConnectionFactory();
	}

	private _notInitializedError() {
		return new Error('SparqlConnectionService is not initialized. Call initialize() with the extension context first.');
	}

	/**
	 * Helper method to read connections from a specific configuration scope.
	 */
	private _getConnectionsFromScope(scope: SparqlConnectionScope): SparqlConnection[] {
		if (!this._initialized) {
			throw this._notInitializedError();
		}

		const config = vscode.workspace.getConfiguration(MENTOR_CONFIG_KEY);
		const inspect = config.inspect<SparqlConnection[]>(CONNECTIONS_CONFIG_KEY);

		const connections = (scope === 'project' ? inspect?.workspaceFolderValue : inspect?.globalValue) || [];

		return connections.map(c => ({ ...c, scope }));
	}

	/**
	 * Retrieves all available SPARQL endpoints, including the internal store.
	 * @returns A promise that resolves to an array of all connections.
	 */
	public async getConnections(): Promise<SparqlConnection[]> {
		if (!this._initialized) {
			throw this._notInitializedError();
		}

		const projectConnections = this._getConnectionsFromScope('project');
		const userConnections = this._getConnectionsFromScope('user');

		// Note: The internal store is always first and is the default.
		return [
			MENTOR_WORKSPACE_STORE,
			...projectConnections,
			...userConnections
		];
	}

	/**
	 * Get the configured SPARQL connection for a specific document.
	 * @param documentUri The URI of the document (e.g., a notebook cell or a SPARQL file).
	 * @returns The SPARQL connection or the Mentor Workspace Store if no connection is found.
	 */
	public async getConnectionForDocument(documentUri: vscode.Uri): Promise<SparqlConnection> {
		if (!this._initialized) {
			throw this._notInitializedError();
		}

		let connectionId = MENTOR_WORKSPACE_STORE.id;

		if (documentUri.scheme === 'vscode-notebook-cell') {
			connectionId = this._getConnectionIdForCell(documentUri) ?? MENTOR_WORKSPACE_STORE.id;
		}

		const connections = await this.getConnections();

		return connections.find(c => c.id === connectionId) ?? MENTOR_WORKSPACE_STORE;
	}

	/**
	 * Retrieves the stored credentials for a given connection ID.
	 * @param connectionId The ID of the connection.
	 * @returns A promise that resolves to the credentials, or undefined if none are found.
	 */
	private async _getCredentials(connectionId: string): Promise<SparqlConnectionCredentials | undefined> {
		if (!this._initialized || !this._secretStorage) {
			throw this._notInitializedError();
		}

		const key = `${SECRET_STORAGE_KEY_PREFIX}${connectionId}`;
		const secret = await this._secretStorage.get(key);

		return secret ? JSON.parse(secret) as SparqlConnectionCredentials : undefined;
	}

	/**
	 * Gets the Comunica-compatible query source for a given document.
	 * For notebooks, it inherits the connection from the previous cell.
	 * Otherwise, it defaults to the Mentor Workspace Store.
	 * @param documentUri The URI of the document (e.g., a notebook cell or a .sparql file).
	 * @returns A promise that resolves to a ComunicaSource configuration.
	 */
	public async getQuerySourceForDocument(documentUri: vscode.Uri): Promise<ComunicaSource> {
		if (!this._initialized) {
			throw this._notInitializedError();
		}

		const connection = await this.getConnectionForDocument(documentUri);

		if (connection.id === MENTOR_WORKSPACE_STORE.id) {
			return {
				type: 'rdfjs',
				value: mentor.store,
			};
		} else {
			const source: SparqlEndpointSource = {
				type: 'sparql',
				value: connection.endpoint,
			};

			const credentials = await this._getCredentials(connection.id);

			if (credentials?.username && credentials.password) {
				const token = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');

				source.headers = {
					...source.headers,
					'Authorization': `Basic ${token}`,
				};
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

		if (!notebook) { return; }

		const targetCell = notebook.getCells().find(cell => cell.document.uri.toString() === cellUri.toString());

		if (!targetCell) { return; }

		const notebookEdit = vscode.NotebookEdit.updateCellMetadata(targetCell.index, {
			...targetCell.metadata,
			connectionId
		});

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
		const notebookUri = cellUri.with({ fragment: '' }).toString();

		return vscode.workspace.notebookDocuments.find(doc => doc.uri.toString() === notebookUri);
	}

	/**
	 * Adds a new SPARQL connection and stores it in the specified settings scope.
	 * @param label A user-friendly name for the connection.
	 * @param endpoint The URL of the SPARQL endpoint.
	 * @param scope Where to save the connection ('project' or 'user').
	 * @param credentials Optional credentials for the connection.
	 */
	public async addConnection(
		label: string,
		endpoint: string,
		scope: SparqlConnectionScope,
		credentials?: SparqlConnectionCredentials
	): Promise<void> {
		if (!this._initialized || !this._secretStorage || !this._connectionFactory) {
			throw this._notInitializedError();
		}

		const newConnection = this._connectionFactory.create(label, endpoint, scope);

		const config = vscode.workspace.getConfiguration(MENTOR_CONFIG_KEY);
		const target = scope === 'project' ? vscode.ConfigurationTarget.WorkspaceFolder : vscode.ConfigurationTarget.Global;
		const existingConnections = this._getConnectionsFromScope(scope);

		await config.update(CONNECTIONS_CONFIG_KEY, [...existingConnections, newConnection], target);

		if (credentials && (credentials.username || credentials.password)) {
			await this._secretStorage.store(
				`${SECRET_STORAGE_KEY_PREFIX}${newConnection.id}`,
				JSON.stringify(credentials)
			);
		}

		this._onDidChangeConnections.fire();
	}

	/**
	 * Deletes a SPARQL connection from the settings.
	 * @param connectionId The ID of the connection to delete.
	 */
	public async removeConnection(connectionId: string): Promise<void> {
		if (!this._initialized || !this._secretStorage) {
			throw this._notInitializedError();
		}

		if (connectionId === MENTOR_WORKSPACE_STORE.id) {
			vscode.window.showErrorMessage('The Mentor Workspace Store cannot be removed.');
			return;
		}

		const connections = await this.getConnections();
		const connectionToDelete = connections.find(c => c.id === connectionId);

		if (!connectionToDelete || connectionToDelete.scope === 'workspace') {
			return;
		}

		const config = vscode.workspace.getConfiguration(MENTOR_CONFIG_KEY);
		const target = connectionToDelete.scope === 'project' ? vscode.ConfigurationTarget.WorkspaceFolder : vscode.ConfigurationTarget.Global;

		const allConnectionsInScope = this._getConnectionsFromScope(connectionToDelete.scope);
		const updatedConnections = allConnectionsInScope.filter(c => c.id !== connectionId);

		await config.update(CONNECTIONS_CONFIG_KEY, updatedConnections, target);
		await this._secretStorage.delete(`${SECRET_STORAGE_KEY_PREFIX}${connectionId}`);

		this._onDidChangeConnections.fire();
	}
}
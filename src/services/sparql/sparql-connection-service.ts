import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ICredentialStorageService } from '@src/services/core';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { AuthCredential } from '../core/credential';
import { SparqlConnection } from './sparql-connection';
import { ComunicaSource } from './sparql-query-source';
import { getConfig } from '@src/utilities/config';
import { SparqlQuerySourceFactory } from './sparql-query-source-factory';
import {
	DefaultSparqlQuerySourceProvider,
	GraphDbQuerySourceProvider,
	WorkspaceQuerySourceProvider,
} from '@src/services/sparql/query-sources';

const CONNECTIONS_CONFIG_KEY = 'sparql.connections';
const DEFAULT_INFERENCE_ENABLED_CONFIG_KEY = 'sparql.defaultInferenceEnabled';
const INFERENCE_ENABLED_STORAGE_KEY_PREFIX = 'mentor.inference.enabled:';
const DOCUMENT_INFERENCE_STORAGE_KEY_PREFIX = 'mentor.inference.document:';

/**
 * The non-removable workspace triple store.
 */
export const MENTOR_WORKSPACE_STORE: SparqlConnection = {
	id: 'workspace',
	endpointUrl: 'workspace:',
	configScope: ConfigurationScope.Workspace,
	isProtected: true,
	storeType: 'workspace'
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

	/**
	 * Notifies listeners that the connection or inference settings for a document have changed.
	 * Use this after bulk updates to cell metadata.
	 * @param documentUri The URI of the document that changed.
	 */
	public notifyDocumentConnectionChanged(documentUri: vscode.Uri): void {
		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	private _defaultEndpointUrl = 'https://';

	private _defaultConfigScope: ConfigurationScope = ConfigurationScope.User;

	private _querySourceFactory: SparqlQuerySourceFactory;

	private get store(): Store {
		return container.resolve<Store>(ServiceToken.Store);
	}

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _credentialStorage: ICredentialStorageService
	) {
		// Initialize the query source factory with all providers
		this._querySourceFactory = new SparqlQuerySourceFactory();
		this._querySourceFactory.registerProvider(new WorkspaceQuerySourceProvider(() => this.store));
		this._querySourceFactory.registerProvider(new GraphDbQuerySourceProvider());
		this._querySourceFactory.registerProvider(new DefaultSparqlQuerySourceProvider());

		// Initialize workspace store with saved inference setting
		const workspaceStore = this._createWorkspaceStoreConnection();
		this._connections = [workspaceStore];
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.Global));
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.Workspace));

		// Listen for notebook changes to inherit settings when new cells are created
		vscode.workspace.onDidChangeNotebookDocument(e => this._onNotebookDocumentChanged(e));

		this._onDidChangeConnections.fire();
	}

	/**
	 * Handles notebook document changes to inherit settings for newly added cells.
	 */
	private async _onNotebookDocumentChanged(e: vscode.NotebookDocumentChangeEvent): Promise<void> {
		for (const change of e.contentChanges) {
			if (change.addedCells.length > 0) {
				await this._inheritSettingsForNewCells(e.notebook, change.addedCells);
			}
		}
	}

	/**
	 * Inherits connection and inference settings for newly added cells from the previous cell.
	 */
	private async _inheritSettingsForNewCells(
		notebook: vscode.NotebookDocument,
		addedCells: readonly vscode.NotebookCell[]
	): Promise<void> {
		const cells = notebook.getCells();
		const edits: vscode.NotebookEdit[] = [];

		for (const addedCell of addedCells) {
			// Skip if cell already has settings
			if (addedCell.metadata?.connectionId !== undefined || addedCell.metadata?.inferenceEnabled !== undefined) {
				continue;
			}

			// Find the previous cell to inherit from
			const cellIndex = addedCell.index;
			let previousCell: vscode.NotebookCell | undefined;

			for (let i = cellIndex - 1; i >= 0; i--) {
				previousCell = cells[i];
				break;
			}

			if (previousCell) {
				const inheritedMetadata: Record<string, unknown> = { ...addedCell.metadata };
				let hasInheritedSettings = false;

				// Inherit connection ID
				if (typeof previousCell.metadata?.connectionId === 'string') {
					inheritedMetadata.connectionId = previousCell.metadata.connectionId;
					hasInheritedSettings = true;
				}

				// Inherit inference setting
				if (typeof previousCell.metadata?.inferenceEnabled === 'boolean') {
					inheritedMetadata.inferenceEnabled = previousCell.metadata.inferenceEnabled;
					hasInheritedSettings = true;
				}

				if (hasInheritedSettings) {
					edits.push(vscode.NotebookEdit.updateCellMetadata(addedCell.index, inheritedMetadata));
				}
			}
		}

		if (edits.length > 0) {
			const workspaceEdit = new vscode.WorkspaceEdit();
			workspaceEdit.set(notebook.uri, edits);
			await vscode.workspace.applyEdit(workspaceEdit);
		}
	}

	/**
	 * Creates the workspace store connection with the saved inference setting.
	 */
	private _createWorkspaceStoreConnection(): SparqlConnection {
		const inferenceEnabled = this._getInferenceEnabledForConnection(MENTOR_WORKSPACE_STORE.id);

		return {
			...MENTOR_WORKSPACE_STORE,
			inferenceSupported: this._querySourceFactory.supportsInference(MENTOR_WORKSPACE_STORE.storeType ?? 'workspace'),
			inferenceEnabled
		};
	}

	/**
	 * Gets the default inference enabled setting from VS Code configuration.
	 * @returns The default value for inference enabled.
	 */
	getDefaultInferenceEnabled(): boolean {
		return getConfig().get<boolean>(DEFAULT_INFERENCE_ENABLED_CONFIG_KEY, false);
	}

	/**
	 * Gets whether inference is enabled for a specific connection.
	 * @param connectionId The ID of the connection.
	 * @returns `true` if inference is enabled, `false` otherwise.
	 */
	getInferenceEnabled(connectionId: string): boolean {
		const connection = this._connections.find(c => c.id === connectionId);
		return connection?.inferenceEnabled ?? this.getDefaultInferenceEnabled();
	}

	/**
	 * Sets whether inference should be enabled for a specific connection.
	 * @param connectionId The ID of the connection.
	 * @param inferenceEnabled `true` to enable inference, `false` to disable it.
	 */
	async setInferenceEnabled(connectionId: string, inferenceEnabled: boolean): Promise<void> {
		const connection = this._connections.find(c => c.id === connectionId);

		if (!connection) {
			throw new Error(`Connection not found: ${connectionId}`);
		}

		if (!this.supportsInference(connection)) {
			throw new Error(`Connection does not support inference toggling: ${connectionId}`);
		}

		// Store the inference setting
		const storageKey = this._getInferenceStorageKey(connectionId);
		await this._extensionContext.workspaceState.update(storageKey, inferenceEnabled);

		// Update the in-memory connection
		connection.inferenceEnabled = inferenceEnabled;

		this._onDidChangeConnections.fire();
	}

	/**
	 * Toggles the inference enabled state for a specific connection.
	 * @param connectionId The ID of the connection.
	 * @returns The new inference enabled state.
	 */
	async toggleInferenceEnabled(connectionId: string): Promise<boolean> {
		const currentValue = this.getInferenceEnabled(connectionId);
		const newValue = !currentValue;
		await this.setInferenceEnabled(connectionId, newValue);
		return newValue;
	}

	/**
	 * Gets the storage key for storing inference enabled setting for a connection.
	 */
	private _getInferenceStorageKey(connectionId: string): string {
		return `${INFERENCE_ENABLED_STORAGE_KEY_PREFIX}${connectionId}`;
	}

	/**
	 * Gets the stored inference enabled setting for a connection.
	 */
	private _getInferenceEnabledForConnection(connectionId: string): boolean {
		const storageKey = this._getInferenceStorageKey(connectionId);
		return this._extensionContext.workspaceState.get<boolean>(
			storageKey,
			this.getDefaultInferenceEnabled()
		);
	}

	/**
	 * Gets the storage key for document-level inference setting.
	 */
	private _getDocumentInferenceStorageKey(documentUri: vscode.Uri): string {
		return `${DOCUMENT_INFERENCE_STORAGE_KEY_PREFIX}${documentUri.toString()}`;
	}

	/**
	 * Gets the effective inference setting for a document or notebook cell.
	 * Priority: document/cell setting → connection setting → global default.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns `true` if inference is enabled, `false` otherwise.
	 */
	getInferenceEnabledForDocument(documentUri: vscode.Uri): boolean {
		const documentSetting = this._getDocumentInferenceSetting(documentUri);

		if (documentSetting !== undefined) {
			return documentSetting;
		}

		// Fall back to connection setting
		const connection = this.getConnectionForDocument(documentUri);
		return connection.inferenceEnabled ?? this.getDefaultInferenceEnabled();
	}

	/**
	 * Gets the document-level inference setting (without fallback).
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The document setting, or `undefined` if not set.
	 */
	private _getDocumentInferenceSetting(documentUri: vscode.Uri): boolean | undefined {
		if (documentUri.scheme === 'vscode-notebook-cell') {
			return this._getInferenceEnabledForCell(documentUri);
		} else {
			const key = this._getDocumentInferenceStorageKey(documentUri);
			return this._extensionContext.workspaceState.get<boolean | undefined>(key, undefined);
		}
	}

	/**
	 * Gets the inference setting from notebook cell metadata.
	 * Each cell is independent - no inheritance from previous cells.
	 * @param cellUri The URI of the notebook cell.
	 * @returns The inference setting, or `undefined` if not set.
	 */
	private _getInferenceEnabledForCell(cellUri: vscode.Uri): boolean | undefined {
		const notebook = this._getNotebookFromCellUri(cellUri);

		if (notebook) {
			const cell = notebook.getCells().find(cell => cell.document.uri.toString() === cellUri.toString());

			if (cell) {
				const inferenceEnabled = cell.metadata?.inferenceEnabled;

				if (typeof inferenceEnabled === 'boolean') {
					return inferenceEnabled;
				}
			}
		}

		return undefined;
	}

	/**
	 * Sets the inference setting for a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @param inferenceEnabled `true` to enable inference, `false` to disable, `undefined` to clear.
	 */
	async setInferenceEnabledForDocument(documentUri: vscode.Uri, inferenceEnabled: boolean | undefined): Promise<void> {
		if (documentUri.scheme === 'vscode-notebook-cell') {
			await this._setInferenceEnabledForCell(documentUri, inferenceEnabled);
		} else {
			const key = this._getDocumentInferenceStorageKey(documentUri);
			await this._extensionContext.workspaceState.update(key, inferenceEnabled);
		}

		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	/**
	 * Sets the inference setting for a notebook cell in its metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param inferenceEnabled The inference setting, or `undefined` to clear.
	 */
	private async _setInferenceEnabledForCell(cellUri: vscode.Uri, inferenceEnabled: boolean | undefined): Promise<void> {
		const notebook = this._getNotebookFromCellUri(cellUri);

		if (!notebook) {
			throw new Error('Notebook document not found for the given cell URI: ' + cellUri.toString());
		}

		const cell = notebook.getCells().find(cell => cell.document.uri.toString() === cellUri.toString());

		if (!cell) {
			throw new Error('Cell not found in the notebook for the given cell URI: ' + cellUri.toString());
		}

		const metadata = { ...cell.metadata };

		if (inferenceEnabled === undefined) {
			delete metadata.inferenceEnabled;
		} else {
			metadata.inferenceEnabled = inferenceEnabled;
		}

		const notebookEdit = vscode.NotebookEdit.updateCellMetadata(cell.index, metadata);
		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.set(notebook.uri, [notebookEdit]);

		await vscode.workspace.applyEdit(workspaceEdit);
	}

	/**
	 * Toggles the inference setting for a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The new inference enabled state.
	 */
	async toggleInferenceEnabledForDocument(documentUri: vscode.Uri): Promise<boolean> {
		const currentValue = this.getInferenceEnabledForDocument(documentUri);
		const newValue = !currentValue;
		await this.setInferenceEnabledForDocument(documentUri, newValue);
		return newValue;
	}

	/**
	 * Clears the document-level inference setting, reverting to connection default.
	 * @param documentUri The URI of the document or notebook cell.
	 */
	async clearInferenceEnabledForDocument(documentUri: vscode.Uri): Promise<void> {
		await this.setInferenceEnabledForDocument(documentUri, undefined);
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
		const inspect = getConfig().inspect<SparqlConnection[]>(CONNECTIONS_CONFIG_KEY);

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
				inferenceSupported: this._querySourceFactory.supportsInference(c.storeType ?? 'sparql'),
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

		const config = getConfig();
		await config.update(CONNECTIONS_CONFIG_KEY, globalConnections, vscode.ConfigurationTarget.Global);
		await config.update(CONNECTIONS_CONFIG_KEY, workspaceConnections, vscode.ConfigurationTarget.Workspace);

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
	 * @param documentIri The URI of the document or notebook cell.
	 * @returns The SPARQL connection or the Mentor Workspace triple store if no connection is found.
	 */
	getConnectionForDocument(documentIri: vscode.Uri | string): SparqlConnection {
		const uri = typeof (documentIri) === 'string' ? vscode.Uri.parse(documentIri) : documentIri;

		let connectionId;

		if (uri.scheme === 'vscode-notebook-cell') {
			connectionId = this._getConnectionIdForCell(uri);
		} else {
			connectionId = this._getConnectionIdForDocument(uri);
		}

		const connection = this.getConnection(connectionId ?? '');

		return connection ?? MENTOR_WORKSPACE_STORE;
	}

	/**
	 * Get a connection ID for a notebook cell from its metadata.
	 * Each cell is independent - no inheritance from previous cells.
	 * @param cellUri The URI of the notebook cell.
	 * @returns The connection ID, or `undefined` if none is set.
	 */
	private _getConnectionIdForCell(cellUri: vscode.Uri): string | undefined {
		const notebook = this._getNotebookFromCellUri(cellUri);

		if (notebook) {
			const cell = notebook.getCells().find(cell => cell.document.uri.toString() === cellUri.toString());

			if (cell) {
				const connectionId = cell.metadata?.connectionId;

				if (typeof connectionId === 'string') {
					return connectionId;
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

		return this._extensionContext.workspaceState.get(key, undefined);
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

			this._extensionContext.workspaceState.update(key, connectionId);
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
	 * Uses document-level inference setting if set, otherwise falls back to connection setting.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to a ComunicaSource configuration.
	 */
	async getQuerySourceForDocument(documentUri: vscode.Uri): Promise<ComunicaSource> {
		const connection = this.getConnectionForDocument(documentUri);
		const inferenceEnabled = this.getInferenceEnabledForDocument(documentUri);
		return this._querySourceFactory.createQuerySource(connection, inferenceEnabled);
	}

	/**
	 * Gets a Comunica query source for a specific connection.
	 * @param connection The SPARQL connection.
	 * @returns A promise that resolves to a ComunicaSource configuration.
	 */
	async getQuerySourceForConnection(connection: SparqlConnection): Promise<ComunicaSource> {
		const inferenceEnabled = connection.inferenceEnabled ?? this.getDefaultInferenceEnabled();
		return this._querySourceFactory.createQuerySource(connection, inferenceEnabled);
	}

	/**
	 * Checks if the given connection supports inference toggling.
	 * @param connection The SPARQL connection to check.
	 * @returns `true` if the connection supports inference, `false` otherwise.
	 */
	supportsInference(connection: SparqlConnection): boolean {
		const storeType = connection.storeType ?? 'sparql';
		return this._querySourceFactory.supportsInference(storeType);
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

		const cell = notebook.getCells().find(cell => cell.document.uri.toString() === cellUri.toString());

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
			configScope: this._defaultConfigScope
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
				credential = await this._credentialStorage.getCredential(connection.id);
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
				const error = {
					code: response.status,
					message: await response.text() || response.statusText
				}

				this._showErrorMessage(connection.endpointUrl, error);

				return error;
			}
		} catch (e: any) {
			const error = {
				code: e.status || e.code || 0,
				message: e.message || String(e)
			};

			this._showErrorMessage(connection.endpointUrl, error);

			return error;
		}
	}

	private _showErrorMessage(endpointUrl: string, error: { code: number; message: string }): void {
		let errorMessage = '';

		if (error.code === 0) {
			errorMessage = `Connection failed: ${endpointUrl}\n Possible causes: Incorrect endpoint URL, the endpoint is unavailable, failing CORS preflight request or a firewall/network policy blocking the request.`;
		} else {
			errorMessage = `Connection failed: Error ${error.code} - ${error.message}`;
		}

		vscode.window.showErrorMessage(errorMessage);
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
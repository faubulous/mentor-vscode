import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { getConfig } from '@src/utilities/vscode/config';
import { ServiceToken } from '@src/services/tokens';
import { ICredentialStorageService } from '@src/services/core';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { AuthCredential, EntraClientAuthCredential } from '@src/services/core/credential';
import { EntraClientCredentialService } from '@src/services/core/entra-client-credential-service';
import { SparqlConnection } from './sparql-connection';
import { ComunicaEndpoint, SparqlEndpoint } from './sparql-endpoint';
import { SparqlStoreConfig, SparqlQueryKind, STORE_QUERY_KIND_PROPERTY } from './sparql-store-config';
import { ISparqlStoreConfigService } from './sparql-store-config-service';
import { ISparqlQueryService } from './sparql-query-service.interface';
import { WorkspaceEndpointProvider } from '@src/languages/sparql/services/endpoints';
import { WORKSPACE_CONNECTION, WORKSPACE_STORE } from './workspace-store';

export { WORKSPACE_CONNECTION, WORKSPACE_STORE };

/**
 * Service for managing connections to SPARQL endpoints.
 */
export class SparqlConnectionService {

	/** VS Code settings key under which SPARQL connections are persisted. */
	private readonly _connectionsConfigKey = 'sparql.connections';

	/** Workspace-state key prefix for per-connection inference settings (`<prefix><connectionId>`). */
	private readonly _inferenceEnabledStorageKeyPrefix = 'mentor.inference.enabled:';

	/** Workspace-state key prefix for per-document inference settings (`<prefix><documentUri>`). */
	private readonly _documentInferenceStorageKeyPrefix = 'mentor.inference.document:';

	/** The current in-memory connection list, including the workspace store at index 0. */
	private _connections: SparqlConnection[] = [];

	private _onDidChangeConnections = new vscode.EventEmitter<void>();

	/** Fired whenever the connection list or a connection's inference state changes. */
	public readonly onDidChangeConnections = this._onDidChangeConnections.event;

	private _onDidChangeConnectionForDocument = new vscode.EventEmitter<vscode.Uri>();

	/** Fired when the active connection or inference setting for a document changes. */
	public readonly onDidChangeConnectionForDocument = this._onDidChangeConnectionForDocument.event;

	private _onDidConnectionTestStart = new vscode.EventEmitter<SparqlConnection>();

	/** Fired immediately before a connection test begins. */
	public readonly onDidConnectionTestStart = this._onDidConnectionTestStart.event;

	private _onDidConnectionTestEnd = new vscode.EventEmitter<{ connection: SparqlConnection; error: { code: number; message: string } | null }>();

	/**
	 * Fired when a connection test completes.
	 * `error` is `null` on success, or contains the error code and message on failure.
	 */
	public readonly onDidConnectionTestEnd = this._onDidConnectionTestEnd.event;

	/** The in-memory provider for the workspace store (the only code-backed store). */
	private readonly _workspaceStore: WorkspaceEndpointProvider;

	/**
	 * Latest known text content of open (or recently open) untitled SPARQL documents, keyed by
	 * their untitled URI string. Maintained from `onDidOpenTextDocument` / `onDidChangeTextDocument`
	 * and seeded when a connection is set, because `onWillSaveTextDocument` does **not** fire for
	 * untitled documents being saved to disk for the first time. Used by `_migrateUntitledSave` to
	 * match a just-saved file back to the untitled document it came from so its per-document settings
	 * (connection, inference) can be migrated to the new file URI.
	 */
	private readonly _untitledSparqlSnapshots = new Map<string, string>();

	/** 
	 * Cached `kind → mentor config key` map, built from package.json on first use.
	 */
	private _storeQueryConfigKeys: Map<string, string> | undefined;

	private get store(): Store {
		return container.resolve<Store>(ServiceToken.Store);
	}

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _credentialStorage: ICredentialStorageService,
		private readonly _storeConfigService: ISparqlStoreConfigService
	) {
		this._workspaceStore = new WorkspaceEndpointProvider(() => this.store);

		const workspaceStore = this._createWorkspaceStoreConnection();
		this._connections = [workspaceStore];
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.Global));
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.Workspace));

		vscode.workspace.onDidChangeNotebookDocument(async e => {
			for (const change of e.contentChanges) {
				if (change.addedCells.length > 0) {
					await this._inheritSettingsForNewCells(e.notebook, change.addedCells);
				}
			}
		});

		vscode.workspace.onDidOpenTextDocument(document => {
			this._snapshotUntitledSparqlDocument(document);
		});

		vscode.workspace.onDidChangeTextDocument(e => {
			this._snapshotUntitledSparqlDocument(e.document);
		});

		vscode.workspace.onDidSaveTextDocument(async document => {
			await this._migrateUntitledSave(document);
		});

		this._onDidChangeConnections.fire();
	}

	/**
	 * Maps each {@link SparqlQueryKind} to the `mentor.*` config key (without the `mentor.` prefix) of
	 * the setting it overrides, by scanning the extension's package.json for properties carrying the
	 * {@link STORE_QUERY_KIND_PROPERTY} marker. Result is cached for the session.
	 */
	private _getStoreQueryConfigKeys(): Map<string, string> {
		if (this._storeQueryConfigKeys) {
			return this._storeQueryConfigKeys;
		}

		const properties = (vscode.extensions.getExtension('faubulous.mentor')?.packageJSON
			?.contributes?.configuration?.[0]?.properties ?? {}) as Record<string, Record<string, unknown>>;

		const map = new Map<string, string>();

		for (const [fullKey, prop] of Object.entries(properties)) {
			const kind = prop[STORE_QUERY_KIND_PROPERTY];

			if (typeof kind === 'string') {
				map.set(kind, fullKey.replace(/^mentor\./, ''));
			}
		}

		this._storeQueryConfigKeys = map;

		return map;
	}

	/**
	 * Records the current text content of an untitled SPARQL document so it can later be matched
	 * to the on-disk file it is saved as. No-op for titled documents and non-SPARQL documents.
	 * @param document The document to snapshot.
	 */
	private _snapshotUntitledSparqlDocument(document: vscode.TextDocument): void {
		if (document.isUntitled && document.languageId === 'sparql') {
			this._untitledSparqlSnapshots.set(document.uri.toString(), document.getText());
		}
	}

	/**
	 * Migrates a just-saved document's per-document settings (connection, inference) from its
	 * previous untitled URI to its new on-disk URI, if it matches a tracked untitled document.
	 * Untitled documents have no `onDidRenameFiles` equivalent when saved to disk for the first
	 * time, and `onWillSaveTextDocument` does not fire for them, so the match is made by comparing
	 * the saved text content against snapshots captured while the document was still untitled.
	 * @param document The document that was just saved.
	 */
	private async _migrateUntitledSave(document: vscode.TextDocument): Promise<void> {
		if (document.isUntitled || document.languageId !== 'sparql') {
			return;
		}

		const content = document.getText();
		const match = [...this._untitledSparqlSnapshots].find(([, snapshot]) => snapshot === content);

		if (!match) {
			return;
		}

		const [oldUriStr] = match;
		this._untitledSparqlSnapshots.delete(oldUriStr);

		await this.handleFileRenames([{ oldUri: vscode.Uri.parse(oldUriStr), newUri: document.uri }]);
	}

	/**
	 * Inherits connection and inference settings for newly added notebook cells from the
	 * immediately preceding cell, so new cells start with the same context as their neighbour.
	 * @param notebook The notebook document that changed.
	 * @param addedCells The cells that were added.
	 */
	private async _inheritSettingsForNewCells(
		notebook: vscode.NotebookDocument,
		addedCells: readonly vscode.NotebookCell[]
	): Promise<void> {
		const cells = notebook.getCells();
		const edits: vscode.NotebookEdit[] = [];

		for (const addedCell of addedCells) {
			if (addedCell.metadata?.connectionId !== undefined || addedCell.metadata?.inferenceEnabled !== undefined) {
				continue;
			}

			let previousCell: vscode.NotebookCell | undefined;

			for (let i = addedCell.index - 1; i >= 0; i--) {
				previousCell = cells[i];
				break;
			}

			if (previousCell) {
				const inheritedMetadata: Record<string, unknown> = { ...addedCell.metadata };
				let hasInheritedSettings = false;

				if (typeof previousCell.metadata?.connectionId === 'string') {
					inheritedMetadata.connectionId = previousCell.metadata.connectionId;
					hasInheritedSettings = true;
				}

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
	 * Creates the workspace store connection with the persisted inference setting.
	 * @returns The workspace store as a SparqlConnection with inference capability set.
	 */
	private _createWorkspaceStoreConnection(): SparqlConnection {
		const storageKey = `${this._inferenceEnabledStorageKeyPrefix}${WORKSPACE_CONNECTION.id}`;
		const inferenceEnabled = this._extensionContext.workspaceState.get<boolean>(storageKey, false);

		return {
			...WORKSPACE_CONNECTION,
			canToggleInference: true,
			inferenceEnabled
		};
	}

	/**
	 * Gets whether inference is currently enabled for a specific connection. Inference is opt-in
	 * per connection (off unless the connection explicitly enables it).
	 * @param connectionId The ID of the connection.
	 * @returns `true` if inference is enabled, `false` otherwise.
	 */
	getInferenceEnabled(connectionId: string): boolean {
		const connection = this._connections.find(c => c.id === connectionId);
		return connection ? (connection.inferenceEnabled ?? false) : false;
	}

	/**
	 * Sets whether inference should be enabled for a specific connection and persists the change.
	 * @param connectionId The ID of the connection.
	 * @param inferenceEnabled `true` to enable inference, `false` to disable it.
	 * @throws If the connection is not found or does not support inference toggling.
	 */
	async setInferenceEnabled(connectionId: string, inferenceEnabled: boolean): Promise<void> {
		const connection = this._connections.find(c => c.id === connectionId);

		if (!connection) {
			throw new Error(`Connection not found: ${connectionId}`);
		}

		if (!this._storeConfigService.supportsInference(connection)) {
			throw new Error(`Connection does not support inference toggling: ${connectionId}`);
		}

		const storageKey = `${this._inferenceEnabledStorageKeyPrefix}${connectionId}`;
		await this._extensionContext.workspaceState.update(storageKey, inferenceEnabled);

		connection.inferenceEnabled = inferenceEnabled;

		this._onDidChangeConnections.fire();
	}

	/**
	 * Toggles the inference-enabled state for a specific connection.
	 * @param connectionId The ID of the connection.
	 * @returns The new inference-enabled state.
	 */
	async toggleInferenceEnabled(connectionId: string): Promise<boolean> {
		const newValue = !this.getInferenceEnabled(connectionId);
		await this.setInferenceEnabled(connectionId, newValue);
		return newValue;
	}

	/**
	 * Gets the effective inference setting for a document or notebook cell.
	 * Priority: document/cell setting → connection setting → global default.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns `true` if inference is enabled, `false` otherwise.
	 */
	getInferenceEnabledForDocument(documentUri: vscode.Uri): boolean {
		const documentSetting = documentUri.scheme === 'vscode-notebook-cell'
			? this._getInferenceEnabledForCell(documentUri)
			: this._extensionContext.workspaceState.get<boolean | undefined>(`${this._documentInferenceStorageKeyPrefix}${documentUri.toString()}`, undefined);

		if (documentSetting !== undefined) {
			return documentSetting;
		}

		const connection = this.getConnectionForDocument(documentUri);
		return connection.inferenceEnabled ?? false;
	}

	/**
	 * Reads the inference setting from a notebook cell's metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @returns The cell-level inference setting, or `undefined` if not set.
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
			const key = `${this._documentInferenceStorageKeyPrefix}${documentUri.toString()}`;
			await this._extensionContext.workspaceState.update(key, inferenceEnabled);
		}

		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	/**
	 * Sets the inference setting on a notebook cell's metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param inferenceEnabled The new inference setting, or `undefined` to clear.
	 * @throws If the notebook or the cell cannot be found.
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

		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.set(notebook.uri, [vscode.NotebookEdit.updateCellMetadata(cell.index, metadata)]);

		await vscode.workspace.applyEdit(workspaceEdit);
	}

	/**
	 * Toggles the inference setting for a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The new inference-enabled state.
	 */
	async toggleInferenceEnabledForDocument(documentUri: vscode.Uri): Promise<boolean> {
		const newValue = !this.getInferenceEnabledForDocument(documentUri);

		await this.setInferenceEnabledForDocument(documentUri, newValue);

		return newValue;
	}

	/**
	 * Notifies listeners that the connection or inference settings for a document have changed.
	 * Use this after bulk updates to cell metadata.
	 * @param documentUri The URI of the document that changed.
	 */
	public notifyDocumentConnectionChanged(documentUri: vscode.Uri): void {
		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	/**
	 * Reads connections from a configuration scope and resolves their inferred store type and
	 * inference support based on the registered store configs.
	 * @param configTarget The configuration target (Global or Workspace) to read from.
	 * @returns The connections found in the given scope, with `configScope` and `canToggleInference` set.
	 */
	private _loadConnectionsFromConfiguration(configTarget: vscode.ConfigurationTarget): SparqlConnection[] {
		const inspect = getConfig().inspect<SparqlConnection[]>(this._connectionsConfigKey);

		if (!inspect) {
			return [];
		}

		const raw = configTarget === vscode.ConfigurationTarget.Global ? inspect.globalValue : inspect.workspaceValue;

		if (!raw) {
			return [];
		}

		const configScope = configTarget === vscode.ConfigurationTarget.Workspace
			? ConfigurationScope.Workspace
			: ConfigurationScope.User;

		return raw.map(c => {
			const storeType = c.storeType ?? this._storeConfigService.defaultStoreType;
			const connection = { ...c, storeType };
			return { ...connection, configScope, canToggleInference: this._storeConfigService.supportsInference(connection) };
		});
	}

	/**
	 * Returns the serializable form of all connections in a given scope, suitable for writing back
	 * to VS Code settings (excludes runtime-only fields and the workspace pseudo-connection).
	 * @param configScope The scope to collect connections for.
	 */
	private _getEndpointDataForConfigScope(configScope: ConfigurationScope) {
		return this._connections
			.filter(c => c.configScope === configScope && c.id !== WORKSPACE_CONNECTION.id)
			.map(c => ({
				id: c.id,
				...(c.description ? { description: c.description } : {}),
				endpointUrl: c.endpointUrl,
				storeType: c.storeType ?? this._storeConfigService.defaultStoreType,
				...(c.autoLoadGraphs !== undefined ? { autoLoadGraphs: c.autoLoadGraphs } : {}),
				...(c.graphReloadIntervalSeconds !== undefined ? { graphReloadIntervalSeconds: c.graphReloadIntervalSeconds } : {}),
			}));
	}

	/**
	 * Persists all in-memory connections to VS Code settings and clears their dirty flags.
	 */
	async saveConfiguration(): Promise<void> {
		const config = getConfig();

		await config.update(this._connectionsConfigKey, this._getEndpointDataForConfigScope(ConfigurationScope.User), vscode.ConfigurationTarget.Global);
		await config.update(this._connectionsConfigKey, this._getEndpointDataForConfigScope(ConfigurationScope.Workspace), vscode.ConfigurationTarget.Workspace);

		for (const connection of this._connections) {
			connection.isNew = false;
			connection.isModified = false;
		}

		this._onDidChangeConnections.fire();
	}

	/**
	 * Retrieves all available SPARQL connections, including the workspace store.
	 * @returns An array of all connections.
	 */
	getConnections(): SparqlConnection[] {
		return this._connections;
	}

	/**
	 * Retrieves all SPARQL connections for a specific configuration scope.
	 * @param configScope The configuration scope to filter connections by.
	 * @returns An array of connections in the given scope.
	 */
	getConnectionsForConfigurationScope(configScope: ConfigurationScope): SparqlConnection[] {
		return this._connections.filter(c => c.configScope === configScope);
	}

	/**
	 * Retrieves a SPARQL connection by its ID.
	 * @param connectionId The ID of the connection to retrieve.
	 * @returns The SPARQL connection, or `undefined` if not found.
	 */
	getConnection(connectionId: string): SparqlConnection | undefined {
		return this._connections.find(c => c.id === connectionId);
	}

	/**
	 * Gets the configured SPARQL connection for a document or notebook cell.
	 * @param documentIri The URI of the document or notebook cell.
	 * @returns The associated connection, or the workspace store if none is set.
	 */
	getConnectionForDocument(documentIri: vscode.Uri | string): SparqlConnection {
		const uri = typeof documentIri === 'string' ? vscode.Uri.parse(documentIri) : documentIri;

		const connectionId = uri.scheme === 'vscode-notebook-cell'
			? this._getConnectionIdForCell(uri)
			: this._extensionContext.workspaceState.get<string>(`sparql.connection:${uri.toString()}`);

		return this.getConnection(connectionId ?? '') ?? WORKSPACE_CONNECTION;
	}

	/**
	 * Reads the connection ID from a notebook cell's metadata.
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
	 * Associates a SPARQL connection with a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	async setQuerySourceForDocument(documentUri: vscode.Uri, connectionId: string): Promise<void> {
		if (documentUri.scheme === 'vscode-notebook-cell') {
			await this.setConnectionForCell(documentUri, connectionId);
		} else {
			this._extensionContext.workspaceState.update(`sparql.connection:${documentUri.toString()}`, connectionId);

			if (documentUri.scheme === 'untitled') {
				const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === documentUri.toString());

				if (document) {
					this._snapshotUntitledSparqlDocument(document);
				}
			}
		}

		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	/**
	 * Gets a Comunica-compatible query source for a document or notebook cell. Uses the
	 * document-level inference setting if set, otherwise falls back to the connection setting.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to a Comunica source configuration.
	 */
	async getQuerySourceForDocument(documentUri: vscode.Uri): Promise<ComunicaEndpoint> {
		const connection = this.getConnectionForDocument(documentUri);
		const inferenceEnabled = this.getInferenceEnabledForDocument(documentUri);
		return this._createQuerySource(connection, inferenceEnabled);
	}

	/**
	 * Gets a Comunica-compatible query source for a specific connection.
	 * @param connection The SPARQL connection.
	 * @returns A promise that resolves to a Comunica source configuration.
	 */
	async getQuerySourceForConnection(connection: SparqlConnection): Promise<ComunicaEndpoint> {
		const inferenceEnabled = connection.inferenceEnabled ?? false;
		return this._createQuerySource(connection, inferenceEnabled);
	}

	/**
	 * Builds a Comunica-compatible source for a connection. The workspace store yields an in-memory
	 * RDF/JS source; every other store type becomes an HTTP SPARQL endpoint whose URL receives
	 * the store config's URL-parameter reasoning control (if any).
	 * @param connection The SPARQL connection.
	 * @param inferenceEnabled Whether inference should be enabled.
	 * @returns The resolved Comunica source configuration.
	 */
	private _createQuerySource(connection: SparqlConnection, inferenceEnabled: boolean): ComunicaEndpoint {
		if (this._storeConfigService.isWorkspaceConnection(connection)) {
			return this._workspaceStore.createEndpoint(inferenceEnabled);
		}

		const store = this._storeConfigService.getStoreConfig(connection.storeType);
		let value = connection.endpointUrl;

		if (store?.inference?.supported && store.inference.urlParameters) {
			try {
				const url = new URL(connection.endpointUrl);
				this._applyUrlInference(url, store, inferenceEnabled);
				value = url.toString();
			} catch {
				// endpointUrl is not a valid absolute URL (e.g. mid-edit) — use it verbatim.
			}
		}

		const source: SparqlEndpoint = { type: 'sparql', value, connection, inferenceEnabled };

		return source;
	}

	/**
	 * Appends the store config's URL-parameter reasoning fragment to an endpoint URL, in place.
	 * No-op unless the store supports reasoning via `urlParameters` and the fragment is non-empty.
	 * @param url The endpoint URL to mutate.
	 * @param store The resolved store config.
	 * @param inferenceEnabled Whether inference is currently enabled.
	 */
	private _applyUrlInference(url: URL, store: SparqlStoreConfig | undefined, inferenceEnabled: boolean): void {
		const inference = store?.inference;

		if (!inference?.supported || !inference.urlParameters) {
			return;
		}

		const fragment = (inferenceEnabled ? inference.urlParameters.enabled : inference.urlParameters.disabled)?.trim().replace(/^[?&]+/, '');

		if (!fragment) {
			return;
		}

		// Append verbatim, preserving the user's exact fragment (no re-encoding/reordering).
		const existing = url.search.replace(/^\?/, '');
		url.search = existing ? `${existing}&${fragment}` : fragment;
	}


	/**
	 * Retrieves the list of named graphs available for a document's connection.
	 * The workspace store enumerates graphs in-process; all other stores execute a
	 * `listGraphs` query against the endpoint.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to an array of graph IRIs.
	 */
	async getGraphsForDocument(documentUri: vscode.Uri): Promise<string[]> {
		const connection = this.getConnectionForDocument(documentUri);
		const inferenceEnabled = this.getInferenceEnabledForDocument(documentUri);

		if (this._storeConfigService.isWorkspaceConnection(connection)) {
			return this._workspaceStore.getGraphs(inferenceEnabled);
		}

		const query = this.getQueryTemplate(connection, 'listGraphs');

		if (!query) {
			return [];
		}

		const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		const result = await queryService.executeQueryOnConnection(query, { ...connection, inferenceEnabled });

		if (!result || result.type !== 'bindings') {
			return [];
		}

		const graphs: string[] = [];

		for (const binding of result.bindings) {
			const term = [...binding][0]?.[1];

			if (term?.value) {
				graphs.push(term.value);
			}
		}

		return graphs;
	}

	/**
	 * Returns the named graphs currently loaded in the in-memory workspace store,
	 * excluding inference graphs.
	 * @returns An array of graph IRIs.
	 */
	getWorkspaceGraphs(): string[] {
		return this._workspaceStore.getGraphs(false);
	}

	/**
	 * Resolves the effective SPARQL query template of the given kind for a connection.
	 * Resolution order: the store config's own query → global `mentor.sparql.*` fallback.
	 * @param connection The SPARQL connection.
	 * @param kind The kind of query template to resolve.
	 * @returns The resolved template, or `undefined` if none is configured at any level.
	 */
	getQueryTemplate(connection: SparqlConnection, kind: SparqlQueryKind): string | undefined {
		const override = this._storeConfigService.getStoreConfig(connection.storeType)?.queries?.[kind];

		if (override) {
			return override;
		}

		// The global fallback key is discovered from the setting marked with this kind in package.json,
		// so package.json stays the single source of truth for which queries are store-overridable.
		const key = this._getStoreQueryConfigKeys().get(kind);

		return key ? getConfig().get<string>(key) : undefined;
	}

	/**
	 * Sets the connection for a specific notebook cell by editing its metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param connectionId The ID of the connection to set.
	 * @throws If the notebook or the cell cannot be found.
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

		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.set(notebook.uri, [vscode.NotebookEdit.updateCellMetadata(cell.index, { ...cell.metadata, connectionId })]);

		await vscode.workspace.applyEdit(workspaceEdit);
	}

	/**
	 * Finds the containing NotebookDocument for a given cell URI by matching paths.
	 * @param cellUri The URI of the notebook cell.
	 * @returns The containing notebook, or `undefined` if not found.
	 */
	private _getNotebookFromCellUri(cellUri: vscode.Uri): vscode.NotebookDocument | undefined {
		for (const notebook of vscode.workspace.notebookDocuments) {
			if (notebook.uri.path === cellUri.path) {
				return notebook;
			}
		}
	}

	/**
	 * Creates a new, unsaved SPARQL connection with a generated ID and default settings.
	 * @returns A promise that resolves to the new connection.
	 */
	async createConnection(): Promise<SparqlConnection> {
		const connection: SparqlConnection = {
			id: uuidv4(),
			isNew: true,
			isModified: false,
			endpointUrl: 'https://',
			configScope: ConfigurationScope.User
		};

		this._connections.push(connection);
		this._onDidChangeConnections.fire();

		return connection;
	}

	/**
	 * Persists a connection edit together with its credential, replacing any existing
	 * credential for the same connection. Surfaces a "saved" notification on success.
	 * @param connection The connection to save.
	 * @param credential The credential to store, or `null` to leave any existing credential untouched.
	 */
	async saveConnectionWithCredential(connection: SparqlConnection, credential: AuthCredential | null): Promise<void> {
		await this.updateConnection(connection);
		await this.saveConfiguration();

		if (credential) {
			await this._credentialStorage.deleteCredential(connection.id);
			await this._credentialStorage.saveCredential(connection.id, credential);
		}

		vscode.window.showInformationMessage('SPARQL connection saved.');
	}

	/**
	 * Updates an existing connection in memory, or inserts it if it does not yet exist.
	 * The workspace store cannot be modified.
	 * @param connection The connection data to apply.
	 */
	async updateConnection(connection: SparqlConnection): Promise<void> {
		if (connection.id === WORKSPACE_CONNECTION.id) {
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
	 * Removes a connection from memory. The workspace store cannot be removed.
	 * @param connectionId The ID of the connection to delete.
	 */
	async deleteConnection(connectionId: string): Promise<void> {
		if (connectionId === WORKSPACE_CONNECTION.id) {
			vscode.window.showErrorMessage('The Mentor Workspace Store cannot be removed.');
			return;
		}

		this._connections = this._connections.filter(c => c.id !== connectionId);

		this._onDidChangeConnections.fire();
	}

	/**
	 * Tests whether a SPARQL endpoint can be reached by sending an ASK query via HTTP POST.
	 * The workspace store is always considered reachable without testing.
	 * @param connection The SPARQL endpoint connection to test.
	 * @param credential If provided, uses these credentials instead of loading stored ones.
	 * @returns `null` on success, or an error object `{ code, message }` on failure.
	 */
	async testConnection(connection: SparqlConnection, credential?: AuthCredential | null): Promise<null | { code: number; message: string }> {
		if (connection.id === 'workspace') {
			return null;
		}

		this._onDidConnectionTestStart.fire(connection);

		try {
			const headers: Record<string, string> = {
				'Content-Type': 'application/sparql-query',
				'Accept': 'application/sparql-results+json,application/json'
			};

			if (credential === undefined) {
				credential = await this._credentialStorage.getCredential(connection.id);
			}

			Object.assign(headers, await this.getAuthHeaders(credential as AuthCredential));

			const response = await fetch(connection.endpointUrl, {
				method: 'POST',
				headers,
				body: 'ASK WHERE { ?s ?p ?o }'
			});

			if (response.ok) {
				this._onDidConnectionTestEnd.fire({ connection, error: null });
				return null;
			}

			const error = {
				code: response.status,
				message: await response.text() || response.statusText
			};

			vscode.window.showErrorMessage(`Connection failed: Error ${error.code} - ${error.message}`);
			this._onDidConnectionTestEnd.fire({ connection, error });

			return error;
		} catch (e: any) {
			const error = {
				code: e.status || e.code || 0,
				message: e.message || String(e)
			};

			vscode.window.showErrorMessage(`Connection failed: ${connection.endpointUrl}\n Possible causes: Incorrect endpoint URL, the endpoint is unavailable, failing CORS preflight request or a firewall/network policy blocking the request.`);
			this._onDidConnectionTestEnd.fire({ connection, error });

			return error;
		}
	}

	/**
	 * Builds HTTP Authorization headers for the given credential.
	 * Returns an empty object when no credential is provided.
	 * @param credential The authentication credential.
	 * @returns A record containing the `Authorization` header, or an empty record.
	 */
	async getAuthHeaders(credential?: AuthCredential): Promise<Record<string, string>> {
		const headers: Record<string, string> = {};

		if (credential?.type === 'basic') {
			headers.Authorization = `Basic ${btoa(`${credential.username}:${credential.password}`)}`;
		} else if (credential?.type === 'bearer') {
			headers.Authorization = `Bearer ${credential.token}`;
		} else if (credential?.type === 'microsoft') {
			headers.Authorization = `Bearer ${credential.accessToken}`;
		} else if (credential?.type === 'entra-client-credentials') {
			const accessToken = await new EntraClientCredentialService().acquireToken(credential as EntraClientAuthCredential);
			headers.Authorization = `Bearer ${accessToken}`;
		}

		return headers;
	}

	/**
	 * Updates all document-scoped workspace state keys (SPARQL connection and inference settings)
	 * when files or folders are renamed in the workspace.
	 *
	 * Both prefixes use the full absolute `file://` URI as the key suffix. For folder renames the
	 * match is done by URI prefix (with a trailing `/` guard to avoid accidentally matching sibling
	 * folders that share a common name prefix).
	 *
	 * Notebook cell settings are stored in cell metadata and travel with the notebook automatically —
	 * they do not need to be migrated here.
	 *
	 * @param files The list of file rename events from `vscode.workspace.onDidRenameFiles`.
	 */
	async handleFileRenames(files: ReadonlyArray<{ oldUri: vscode.Uri; newUri: vscode.Uri }>): Promise<void> {
		const prefixes = [
			'sparql.connection:',
			this._documentInferenceStorageKeyPrefix,
		];

		for (const { oldUri, newUri } of files) {
			const oldUriStr = oldUri.toString();
			const newUriStr = newUri.toString();

			for (const key of this._extensionContext.workspaceState.keys()) {
				for (const prefix of prefixes) {
					if (!key.startsWith(prefix)) {
						continue;
					}

					const uriPart = key.slice(prefix.length);

					const isMatch =
						uriPart === oldUriStr ||
						uriPart.startsWith(oldUriStr + '/');

					if (isMatch) {
						const newKey = prefix + newUriStr + uriPart.slice(oldUriStr.length);
						const value = this._extensionContext.workspaceState.get(key);

						await this._extensionContext.workspaceState.update(newKey, value);
						await this._extensionContext.workspaceState.update(key, undefined);
					}
				}
			}
		}
	}
}

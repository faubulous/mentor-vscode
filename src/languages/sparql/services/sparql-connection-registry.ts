import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '@src/utilities/vscode/config';
import { ICredentialStorageService } from '@src/services/core';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { AuthCredential } from '@src/services/core/credential';
import { SparqlConnection } from './sparql-connection';
import { ITripleStoreConfigService } from './triple-store-config-service.interface';
import { WORKSPACE_CONNECTION, WORKSPACE_STORE } from './workspace-store';

export { WORKSPACE_CONNECTION, WORKSPACE_STORE };

/**
 * Service for managing connections to SPARQL endpoints: the in-memory connection
 * registry, its persistence to VS Code settings, and per-connection inference settings.
 *
 * Document- and notebook-cell-scoped settings live in `DocumentConnectionService`;
 * endpoint reachability testing lives in `SparqlEndpointTester`.
 */
export class SparqlConnectionRegistry {

	/**
	 * VS Code settings key under which SPARQL connections are persisted.
	 */
	private readonly _connectionsConfigKey = 'sparql.connections';

	/**
	 * Workspace-state key prefix for per-connection inference settings (`<prefix><connectionId>`).
	 */
	private readonly _inferenceEnabledStorageKeyPrefix = 'mentor.inference.enabled:';

	/**
	 * The current in-memory connection list, including the workspace store at index 0.
	 */
	private _connections: SparqlConnection[] = [];

	private _onDidChangeConnections = new vscode.EventEmitter<void>();

	/**
	 * Fired whenever the connection list or a connection's inference state changes.
	 */
	public readonly onDidChangeConnections = this._onDidChangeConnections.event;

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _credentialStorage: ICredentialStorageService,
		private readonly _storeConfigService: ITripleStoreConfigService
	) {
		// Workspace-scope connections load before user-scope ones so that a
		// workspace definition wins on a duplicate id in `getConnection`,
		// matching how stores and validation profiles resolve scope collisions.
		this._connections = [this._createWorkspaceStoreConnection()];
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.Workspace));
		this._connections.push(...this._loadConnectionsFromConfiguration(vscode.ConfigurationTarget.Global));

		this._onDidChangeConnections.fire();
	}

	/**
	 * Creates the workspace store connection with the persisted inference setting.
	 * @returns The workspace store as a SparqlConnection with inference capability set.
	 */
	private _createWorkspaceStoreConnection(): SparqlConnection {
		return {
			...WORKSPACE_CONNECTION,
			canToggleInference: true
		};
	}

	/**
	 * Gets whether inference is currently enabled for a specific connection. Inference is opt-in
	 * per connection (off unless the connection explicitly enables it).
	 * @param connectionId The ID of the connection.
	 * @returns `true` if inference is enabled, `false` otherwise.
	 */
	getInferenceEnabled(connectionId: string): boolean {
		const storageKey = `${this._inferenceEnabledStorageKeyPrefix}${connectionId}`;
		return this._extensionContext.workspaceState.get<boolean>(storageKey, false);
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
	 * Creates a new, unsaved SPARQL connection with a generated ID and default settings.
	 * @param scope The configuration scope to create the connection in. When omitted, new
	 * connections are project-scoped so endpoints can be shared via version control,
	 * falling back to User scope when no workspace folder is open.
	 * @returns A promise that resolves to the new connection.
	 */
	async createConnection(scope?: ConfigurationScope): Promise<SparqlConnection> {
		const hasWorkspace = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;

		const connection: SparqlConnection = {
			id: uuidv4(),
			isNew: true,
			isModified: false,
			endpointUrl: 'https://',
			autoLoadGraphs: true,
			configScope: scope ?? (hasWorkspace ? ConfigurationScope.Workspace : ConfigurationScope.User)
		};

		this._connections.push(connection);
		this._onDidChangeConnections.fire();

		return connection;
	}

	/**
	 * Persists a connection edit together with its credential, replacing any existing
	 * credential for the same connection.
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
	}

	/**
	 * Updates an existing connection in memory, or inserts it if it does not yet exist.
	 * @param connection The connection data to apply.
	 * @throws If the connection is the protected workspace store.
	 */
	async updateConnection(connection: SparqlConnection): Promise<void> {
		if (connection.id === WORKSPACE_CONNECTION.id) {
			throw new Error('The Mentor Workspace Store cannot be modified.');
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
	 * Removes a connection from memory.
	 * @param connectionId The ID of the connection to delete.
	 * @throws If the connection is the protected workspace store.
	 */
	async deleteConnection(connectionId: string): Promise<void> {
		if (connectionId === WORKSPACE_CONNECTION.id) {
			throw new Error('The Mentor Workspace Store cannot be removed.');
		}

		this._connections = this._connections.filter(c => c.id !== connectionId);

		this._onDidChangeConnections.fire();
	}
}

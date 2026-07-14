import * as vscode from 'vscode';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { AuthCredential } from '@src/services/core/credential';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';

/**
 * Manages the SPARQL connection registry, its persistence to VS Code settings,
 * and per-connection inference settings.
 *
 * Document- and notebook-cell-scoped settings live in `IDocumentConnectionService`;
 * endpoint reachability testing lives in `ISparqlEndpointTester`; query sources
 * are built by `ISparqlQuerySourceFactory`.
 */
export interface ISparqlConnectionRegistry {
	/**
	 * Event fired when the connections list changes.
	 */
	readonly onDidChangeConnections: vscode.Event<void>;

	/**
	 * Persists the in-memory connections to configuration.
	 */
	saveConfiguration(): Promise<void>;

	/**
	 * Retrieves all available SPARQL endpoints, including the internal store.
	 * @returns An array of all connections.
	 */
	getConnections(): SparqlConnection[];

	/**
	 * Retrieves all SPARQL connections for a specific configuration scope.
	 * @param configScope The configuration scope to filter connections by.
	 * @returns An array of SPARQL connections for the specified configuration scope.
	 */
	getConnectionsForConfigurationScope(configScope: ConfigurationScope): SparqlConnection[];

	/**
	 * Retrieves a SPARQL connection by its ID.
	 * @param connectionId The ID of the connection to retrieve.
	 * @returns The SPARQL connection or `undefined` if not found.
	 */
	getConnection(connectionId: string): SparqlConnection | undefined;

	/**
	 * Gets whether inference is enabled for a specific connection.
	 * @param connectionId The ID of the connection.
	 * @returns `true` if inference is enabled, `false` otherwise.
	 */
	getInferenceEnabled(connectionId: string): boolean;

	/**
	 * Sets whether inference should be enabled for a specific connection.
	 * @param connectionId The ID of the connection.
	 * @param inferenceEnabled `true` to enable inference, `false` to disable it.
	 */
	setInferenceEnabled(connectionId: string, inferenceEnabled: boolean): Promise<void>;

	/**
	 * Toggles the inference enabled state for a specific connection.
	 * @param connectionId The ID of the connection.
	 * @returns The new inference enabled state.
	 */
	toggleInferenceEnabled(connectionId: string): Promise<boolean>;

	/**
	 * Adds a new SPARQL connection.
	 * @param scope The configuration scope to create the connection in. Defaults to the
	 * workspace scope when a workspace folder is open, otherwise the user scope.
	 * @returns A promise that resolves to the new SPARQL connection.
	 */
	createConnection(scope?: ConfigurationScope): Promise<SparqlConnection>;

	/**
	 * Updates an existing SPARQL connection.
	 * @param connection The connection to update.
	 * @throws If the connection is the protected workspace store.
	 */
	updateConnection(connection: SparqlConnection): Promise<void>;

	/**
	 * Persists a connection edit together with its credential, replacing any existing
	 * credential for the same connection.
	 * @param connection The connection to update.
	 * @param credential The credential to store, or `null` to leave existing credentials untouched.
	 */
	saveConnectionWithCredential(connection: SparqlConnection, credential: AuthCredential | null): Promise<void>;

	/**
	 * Deletes a SPARQL connection from the settings.
	 * @param connectionId The ID of the connection to delete.
	 * @throws If the connection is the protected workspace store.
	 */
	deleteConnection(connectionId: string): Promise<void>;
}

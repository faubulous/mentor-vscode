import * as vscode from 'vscode';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { AuthCredential } from '@src/services/core/credential';
import { SparqlConnection } from '@src/services/sparql/sparql-connection';
import { ComunicaSource } from '@src/services/sparql/sparql-query-source';

/**
 * Interface for the SparqlConnectionService.
 */
export interface ISparqlConnectionService {
	/**
	 * Event fired when the connections list changes.
	 */
	readonly onDidChangeConnections: vscode.Event<void>;

	/**
	 * Event fired when the connection for a document changes.
	 */
	readonly onDidChangeConnectionForDocument: vscode.Event<vscode.Uri>;

	/**
	 * Persists the in-memory connections to configuration.
	 */
	saveConfiguration(): Promise<void>;

	/**
	 * Get the configuration scopes supported for storing SPARQL connections.
	 * @returns An array of supported configuration scopes.
	 */
	getSupportedConfigurationScopes(): ConfigurationScope[];

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
	 * Get the configured SPARQL connection for a specific document.
	 * @param documentIri The URI of the document or notebook cell.
	 * @returns The SPARQL connection or the Mentor Workspace triple store if no connection is found.
	 */
	getConnectionForDocument(documentIri: vscode.Uri | string): SparqlConnection;

	/**
	 * Sets the SPARQL connection for a specific document.
	 * @param documentUri The URI of the document or notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	setQuerySourceForDocument(documentUri: vscode.Uri, connectionId: string): Promise<void>;

	/**
	 * Retrieves the SPARQL connection for a specific endpoint URL.
	 * @param endpointUrl The URL of the SPARQL endpoint.
	 * @returns The SPARQL connection or `undefined` if not found.
	 */
	getConnectionForEndpoint(endpointUrl: string): SparqlConnection | undefined;

	/**
	 * Gets the Comunica-compatible query source for a given document.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to a ComunicaSource configuration.
	 */
	getQuerySourceForDocument(documentUri: vscode.Uri): Promise<ComunicaSource>;

	/**
	 * Gets a Comunica query source for a specific connection.
	 * @param connection The SPARQL connection.
	 * @returns A promise that resolves to a ComunicaSource configuration.
	 */
	getQuerySourceForConnection(connection: SparqlConnection): Promise<ComunicaSource>;

	/**
	 * Retrieves the list of named graphs available for a document.
	 * Takes into account the document's connection and inference settings.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to an array of graph IRIs.
	 */
	getGraphsForDocument(documentUri: vscode.Uri): Promise<string[]>;

	/**
	 * Gets the default inference enabled setting from VS Code configuration.
	 * @returns The default value for inference enabled.
	 */
	getDefaultInferenceEnabled(): boolean;

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
	 * Gets the effective inference setting for a document or notebook cell.
	 * Priority: document/cell setting → connection setting → global default.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns `true` if inference is enabled, `false` otherwise.
	 */
	getInferenceEnabledForDocument(documentUri: vscode.Uri): boolean;

	/**
	 * Sets the inference setting for a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @param inferenceEnabled `true` to enable inference, `false` to disable, `undefined` to clear.
	 */
	setInferenceEnabledForDocument(documentUri: vscode.Uri, inferenceEnabled: boolean | undefined): Promise<void>;

	/**
	 * Toggles the inference setting for a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The new inference enabled state.
	 */
	toggleInferenceEnabledForDocument(documentUri: vscode.Uri): Promise<boolean>;

	/**
	 * Clears the document-level inference setting, reverting to connection default.
	 * @param documentUri The URI of the document or notebook cell.
	 */
	clearInferenceEnabledForDocument(documentUri: vscode.Uri): Promise<void>;

	/**
	 * Checks if the given connection supports inference toggling.
	 * @param connection The SPARQL connection to check.
	 * @returns `true` if the connection supports inference, `false` otherwise.
	 */
	supportsInference(connection: SparqlConnection): boolean;

	/**
	 * Sets the connection for a specific notebook cell by editing its metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	setConnectionForCell(cellUri: vscode.Uri, connectionId: string): Promise<void>;

	/**
	 * Notifies listeners that the connection or inference settings for a document have changed.
	 * Use this after bulk updates to cell metadata.
	 * @param documentUri The URI of the document that changed.
	 */
	notifyDocumentConnectionChanged(documentUri: vscode.Uri): void;

	/**
	 * Adds a new SPARQL connection.
	 * @returns A promise that resolves to the new SPARQL connection.
	 */
	createConnection(): Promise<SparqlConnection>;

	/**
	 * Updates an existing SPARQL connection.
	 * @param connection The connection to update.
	 */
	updateConnection(connection: SparqlConnection): Promise<void>;

	/**
	 * Deletes a SPARQL connection from the settings.
	 * @param connectionId The ID of the connection to delete.
	 */
	deleteConnection(connectionId: string): Promise<void>;

	/**
	 * Tests if a connection with a SPARQL endpoint can be established.
	 * @param connection The SPARQL endpoint connection to test.
	 * @param credential If provided, uses these credentials instead of fetching stored ones.
	 * @returns `null` if the connection is successful, or an error object otherwise.
	 */
	testConnection(connection: SparqlConnection, credential?: AuthCredential | null): Promise<null | { code: number; message: string }>;

	/**
	 * Returns HTTP Authorization headers for the given credential.
	 * @param credential The authentication credential.
	 * @returns HTTP headers with Authorization header if credential is provided.
	 */
	getAuthHeaders(credential?: AuthCredential): Promise<Record<string, string>>;
}

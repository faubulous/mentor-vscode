import * as vscode from 'vscode';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { AuthCredential } from '@src/services/core/credential';
import { SparqlConnection } from '@src/services/core/sparql-connection';
import { ComunicaSource } from '@src/services/core/sparql-query-source';

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
	 * Sets the connection for a specific notebook cell by editing its metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	setConnectionForCell(cellUri: vscode.Uri, connectionId: string): Promise<void>;

	/**
	 * Adds a new SPARQL connection.
	 * @returns A promise that resolves to the new SPARQL connection.
	 */
	createConnection(): Promise<SparqlConnection>;

	/**
	 * Updates an existing SPARQL connection.
	 * @param connection The connection to update.
	 */
	updateEndpoint(connection: SparqlConnection): Promise<void>;

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

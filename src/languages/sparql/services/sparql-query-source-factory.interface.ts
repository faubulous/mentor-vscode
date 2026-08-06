import * as vscode from 'vscode';
import { SparqlConnection } from './sparql-connection';
import { ComunicaEndpoint } from './sparql-endpoint';

/**
 * Builds Comunica-compatible query sources for SPARQL connections and documents.
 */
export interface ISparqlQuerySourceFactory {
	/**
	 * Gets a Comunica-compatible query source for a document or notebook cell. Uses the
	 * document-level inference setting if set, otherwise falls back to the connection setting.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to a Comunica source configuration.
	 */
	getQuerySourceForDocument(documentUri: vscode.Uri): Promise<ComunicaEndpoint>;

	/**
	 * Gets a Comunica-compatible query source for a specific connection.
	 * @param connection The SPARQL connection.
	 * @param inferenceEnabled Optional inference override; defaults to the connection's persisted setting.
	 * @returns A promise that resolves to a Comunica source configuration.
	 */
	getQuerySourceForConnection(connection: SparqlConnection, inferenceEnabled?: boolean): Promise<ComunicaEndpoint>;
}

import * as vscode from 'vscode';
import { AuthCredential } from '@src/services/core/credential';
import { SparqlConnection } from './sparql-connection';

/**
 * Tests the reachability of SPARQL endpoint connections.
 */
export interface ISparqlEndpointTester {
	/**
	 * Fired immediately before a connection test begins.
	 */
	readonly onDidConnectionTestStart: vscode.Event<SparqlConnection>;

	/**
	 * Fired when a connection test completes. `error` is `null` on success, or
	 * contains the error code and message on failure.
	 */
	readonly onDidConnectionTestEnd: vscode.Event<{ connection: SparqlConnection; error: { code: number; message: string } | null }>;

	/**
	 * Tests if a connection with a SPARQL endpoint can be established.
	 * @param connection The SPARQL endpoint connection to test.
	 * @param credential If provided, uses these credentials instead of fetching stored ones.
	 * @returns `null` if the connection is successful, or an error object otherwise.
	 */
	testConnection(connection: SparqlConnection, credential?: AuthCredential | null): Promise<null | { code: number; message: string }>;
}

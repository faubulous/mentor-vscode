import * as vscode from 'vscode';
import { ICredentialStorageService } from '@src/services/core';
import { AuthCredential } from '@src/services/core/credential';
import { SparqlConnection } from './sparql-connection';
import { WORKSPACE_CONNECTION } from './workspace-store';
import { getAuthorizationHeader } from './sparql-auth';
import { ISparqlEndpointTester } from './sparql-endpoint-tester.interface';

/**
 * Tests the reachability of SPARQL endpoint connections by sending an ASK query
 * via HTTP POST. Test progress is surfaced through events; results are returned
 * to the caller — surfacing errors to the user is the caller's concern.
 */
export class SparqlEndpointTester implements ISparqlEndpointTester {
	private _onDidConnectionTestStart = new vscode.EventEmitter<SparqlConnection>();

	/**
	 * Fired immediately before a connection test begins.
	 */
	public readonly onDidConnectionTestStart = this._onDidConnectionTestStart.event;

	private _onDidConnectionTestEnd = new vscode.EventEmitter<{ connection: SparqlConnection; error: { code: number; message: string } | null }>();

	/**
	 * Fired when a connection test completes. `error` is `null` on success, or
	 * contains the error code and message on failure.
	 */
	public readonly onDidConnectionTestEnd = this._onDidConnectionTestEnd.event;

	constructor(private readonly _credentialStorage: ICredentialStorageService) { }

	/**
	 * Tests whether a SPARQL endpoint can be reached by sending an ASK query via HTTP POST.
	 * The workspace store is always considered reachable without testing.
	 * @param connection The SPARQL endpoint connection to test.
	 * @param credential If provided, uses these credentials instead of loading stored ones.
	 * @returns `null` on success, or an error object `{ code, message }` on failure.
	 */
	async testConnection(connection: SparqlConnection, credential?: AuthCredential | null): Promise<null | { code: number; message: string }> {
		if (connection.id === WORKSPACE_CONNECTION.id) {
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

			const authHeader = await getAuthorizationHeader(credential ?? undefined);

			if (authHeader) {
				headers.Authorization = authHeader;
			}

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

			this._onDidConnectionTestEnd.fire({ connection, error });

			return error;
		} catch (e: any) {
			const error = {
				code: e.status || e.code || 0,
				message: e.message || String(e)
			};

			this._onDidConnectionTestEnd.fire({ connection, error });

			return error;
		}
	}
}

import * as vscode from 'vscode';
import { SparqlLexer, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { QueryEngine } from "@comunica/query-sparql";
import { AsyncIterator } from 'asynciterator';
import { Bindings, Quad } from "@rdfjs/types";
import { AuthCredential, EntraClientAuthCredential } from '@src/services/core/credential';
import { ICredentialStorageService } from '@src/services/core';
import { EntraClientCredentialService } from '@src/services/core/entra-client-credential-service';
import { ISparqlConnectionService, ISparqlResultSerializer } from '@src/languages/sparql/services';
import { ISparqlStoreConfigService } from './sparql-store-config-service';
import { WorkspaceUri } from "@src/providers/workspace-uri";
import { CancellationError, withCancellation } from '@src/utilities/vscode/cancellation';
import { getConfig } from '@src/utilities/vscode/config';
import { SparqlQueryExecutionState, SparqlQueryType, SparqlRawResponse } from "./sparql-query-state";
import { SparqlConnection } from './sparql-connection';

/**
 * The key for storing query history in local storage.
 */
const HISTORY_STORAGE_KEY = 'mentor.sparql.queryHistory';

/**
 * The maximum number of entries to keep in the query history.
 */
const HISTORY_MAX_ENTRIES = 10;

/**
 * The maximum number of characters of a raw response body to retain. Larger bodies are
 * truncated to keep them out of memory and the webview message channel.
 */
const MAX_RAW_RESPONSE_LENGTH = 5_000_000;

/**
 * A service for executing SPARQL queries against an RDF endpoint. The service
 * keeps a log of the executed queries in temporal order in memory, and upon
 * disposal, it saves the query history to a workspace-scoped local storage,
 * excluding unsaved documents. This query history is then restored when the 
 * service is instantiated.
 */
export class SparqlQueryService {
	private readonly _history: SparqlQueryExecutionState[] = [];

	private readonly _cancellationTokens = new Map<string, vscode.CancellationTokenSource>();

	private readonly _onDidHistoryChange = new vscode.EventEmitter<void>();

	/**
	 * Event that is triggered when the query history changes.
	 */
	onDidHistoryChange: vscode.Event<void> = this._onDidHistoryChange.event;

	private readonly _onDidQueryExecutionStart = new vscode.EventEmitter<SparqlQueryExecutionState>();

	/**
	 * Event that is triggered before a SPARQL query is about to be executed.
	 */
	onDidQueryExecutionStart: vscode.Event<SparqlQueryExecutionState> = this._onDidQueryExecutionStart.event;

	private readonly _onDidQueryExecutionEnd = new vscode.EventEmitter<SparqlQueryExecutionState>();

	/**
	 * Event that is triggered when a SPARQL query execution has ended with any result.
	 */
	onDidQueryExecutionEnd: vscode.Event<SparqlQueryExecutionState> = this._onDidQueryExecutionEnd.event;

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _credentialStorage: ICredentialStorageService,
		private readonly _connectionService: ISparqlConnectionService,
		private readonly _resultSerializer: ISparqlResultSerializer,
		private readonly _storeConfigService: ISparqlStoreConfigService
	) {
		for (const entry of this._loadQueryHistory()) {
			this._history.push(entry);
		}

		const disposables = [
			vscode.workspace.onDidCloseTextDocument((e) => this._onTextDocumentClosed(e))
		];

		this._extensionContext.subscriptions.push(...disposables);
	}

	/**
	 * Handles the closing of a text document and removes unsaved queries from the history.
	 * @param document A text document.
	 */
	private _onTextDocumentClosed(document: vscode.TextDocument) {
		if (document.uri.scheme === 'untitled') {
			const i = this._history.findIndex(q => q.documentIri && q.documentIri === document.uri.toString());

			this.removeQueryStateAt(i);
		}
	}

	/**
	 * Creates a new SPARQL query state from a query string.
	 * @param querySource The source document or notebook cell where the query is stored.
	 * @param query The SPARQL query string.
	 * @returns A new SparqlQueryExecutionState instance.
	 */
	createQuery(querySource: vscode.TextDocument | vscode.NotebookCell, query: string): SparqlQueryExecutionState {
		const source = this._getDocumentFromQuerySource(querySource);
		const workspaceIri = WorkspaceUri.toWorkspaceUri(source.document.uri);
		const queryType = this._getQueryType(query);

		return {
			id: crypto.randomUUID(),
			documentIri: source.document.uri.toString(),
			workspaceIri: workspaceIri?.toString(),
			notebookIri: source.notebookIri?.toString(),
			cellIndex: source.cellIndex,
			query,
			queryType,
			startTime: Date.now()
		};
	}

	/**
	 * Creates a new SPARQL query state for a background query with no associated document.
	 * @param connection The SPARQL connection to execute the query against.
	 * @param query The SPARQL query string.
	 * @param label A human-readable label shown as the tab title (e.g. 'List Graphs').
	 * @returns A new SparqlQueryExecutionState instance marked as a background query.
	 */
	createBackgroundQuery(connection: SparqlConnection, query: string, label: string): SparqlQueryExecutionState {
		const queryType = this._getQueryType(query);

		return {
			id: crypto.randomUUID(),
			label,
			connectionId: connection.id,
			connectionName: connection.endpointUrl,
			isBackground: true,
			query,
			queryType,
			startTime: Date.now()
		};
	}

	/**
	 * Creates a new SPARQL query state from a document or notebook cell.
	 * @param querySource The source document or notebook cell where the query is stored.
	 * @returns A new SparqlQueryContext instance.
	 */
	createQueryFromDocument(querySource: vscode.TextDocument | vscode.NotebookCell): SparqlQueryExecutionState {
		const source = this._getDocumentFromQuerySource(querySource);
		const workspaceIri = WorkspaceUri.toWorkspaceUri(source.document.uri);
		const query = source.document.getText();
		const queryType = this._getQueryType(query);

		return {
			id: crypto.randomUUID(),
			documentIri: source.document.uri.toString(),
			workspaceIri: workspaceIri?.toString(),
			notebookIri: source.notebookIri?.toString(),
			cellIndex: source.cellIndex,
			query,
			queryType,
			startTime: Date.now()
		};
	}

	private _getDocumentFromQuerySource(querySource: vscode.TextDocument | vscode.NotebookCell) {
		if ('notebook' in querySource && querySource.notebook) {
			const cell = querySource as vscode.NotebookCell;

			return {
				document: cell.document,
				notebookIri: cell.notebook.uri,
				cellIndex: cell.index
			};
		} else {
			return { document: querySource as vscode.TextDocument };
		}
	}

	private _loadQueryHistory(limit: number = 10): SparqlQueryExecutionState[] {
		const history = this._extensionContext.workspaceState.get<SparqlQueryExecutionState[]>(HISTORY_STORAGE_KEY, []);

		return history
			.filter(q => q)
			.slice(0, limit)
			.sort((a, b) => b.startTime - a.startTime);
	}

	private async _persistQueryHistory(): Promise<void> {
		// Filter the query history to exclude execution states that would not be valid after a restart.
		const filteredHistory = this._history
			.filter(q => q && !q.isBackground && q.documentIri && !q.documentIri.startsWith('untitled'))
			.slice(0, HISTORY_MAX_ENTRIES);

		await this._extensionContext.workspaceState.update(HISTORY_STORAGE_KEY, filteredHistory);
	}

	/**
	 * Get the SPARQL query state for a specific document IRI.
	 * @param documentIri The IRI of the document to retrieve the query state for.
	 * @returns The SparqlQueryState for the specified document, or `undefined` if not found.
	 */
	getQueryStateForDocument(documentIri: string): SparqlQueryExecutionState | undefined {
		return this._history.find(q => q.documentIri === documentIri);
	}

	/**
	 * Removes a SPARQL query state from the history and triggers the history change event.
	 * @param state The SparqlQueryState to remove.
	 */
	removeQueryState(state: SparqlQueryExecutionState) {
		const n = this._history.findIndex(q => q === state);

		this.removeQueryStateAt(n);
	}

	/**
	 * Cancels a running SPARQL query execution.
	 * @param queryStateID Id of the query execution state.
	 * @returns `true` if the query was successfully cancelled, `false` otherwise.
	 */
	cancelQuery(queryStateID: string): boolean {
		if (this._cancellationTokens.has(queryStateID)) {
			this._cancellationTokens.get(queryStateID)?.cancel();
			this._cancellationTokens.delete(queryStateID);
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Removes the n-th item from the query history and triggers the history change event.
	 * @param index The index of the item to remove from the query history.
	 */
	removeQueryStateAt(index: number): boolean {
		if (index >= 0 && index < this._history.length) {
			const queryState = this._history[index];

			this.cancelQuery(queryState.id);

			this._history.splice(index, 1);

			this._onDidHistoryChange.fire();

			this._persistQueryHistory();

			return true;
		} else {
			return false;
		}
	}

	/**
	 * Executes a SPARQL query against the RDF store and returns the results.
	 * @param query The SPARQL query to execute.
	 * @param documentIri The IRI of the document where the query is run.
	 * @param tokenSource A cancellation token source to cancel the query execution.
	 * @returns A promise that resolves to the results of the query.
	 */
	async executeQuery(context: SparqlQueryExecutionState, tokenSource: vscode.CancellationTokenSource = new vscode.CancellationTokenSource()): Promise<SparqlQueryExecutionState> {
		// Resolves to the last raw HTTP response received from the endpoint (if any), so it
		// can be inspected via the results panel regardless of whether the query succeeded.
		let rawResponsePromise: Promise<SparqlRawResponse | undefined> = Promise.resolve(undefined);

		try {
			const query = this._getQueryText(context);

			if (!query) {
				throw new Error('Unable to retrieve query from the document: ' + context.documentIri);
			}

			this._cancellationTokens.set(context.id, tokenSource);

			this._logQueryExecutionStart(context);

			let source: any;

			if (context.connectionId && !context.documentIri) {
				const connection = this._connectionService.getConnection(context.connectionId);

				if (!connection) {
					throw new Error('Could not find connection with ID: ' + context.connectionId);
				}

				source = await this._connectionService.getQuerySourceForConnection(connection);
			} else {
				const documentIri = vscode.Uri.parse(context.documentIri!);
				source = await this._connectionService.getQuerySourceForDocument(documentIri);
			}

			const result = await this._executeQueryOnSource(query, source, tokenSource.token, (raw) => {
				rawResponsePromise = raw;
			});

			if (result.type === 'bindings') {
				context.result = await this._resultSerializer.serializeBindings(context, result.bindings, tokenSource.token);
			} else if (result.type === 'boolean') {
				context.result = { type: 'boolean', value: result.value };
			} else if (result.type === 'quads') {
				context.result = {
					type: 'quads',
					mimeType: 'text/turtle',
					document: await this._resultSerializer.serializeQuads(context, result.quads, tokenSource.token)
				};
			} else {
				context.result = undefined;
			}
		} catch (error: any) {
			// `fetch` (undici) reports low-level network failures as the opaque message
			// 'fetch failed' and nests the real reason (ECONNREFUSED, ENOTFOUND, TLS errors,
			// CORS, …) in `error.cause`. Surface it so the panel can show why it failed.
			const cause = error?.cause;

			context.error = {
				type: error.name || 'QueryError',
				message: error.message || 'Unknown error occurred while executing the query.',
				cause: cause ? { code: cause.code, message: cause.message ?? String(cause) } : undefined,
				stack: error.stack || '',
				statusCode: error.statusCode || 500,
				cancelled: error instanceof CancellationError
			}
		}

		context.rawResponse = await rawResponsePromise;

		context.endTime = Date.now();

		this._logQueryExecutionEnd(context);
		this._persistQueryHistory();

		return context;
	}

	/**
	 * Registers an already-completed query state in the history and notifies listeners,
	 * without executing anything. Used to surface pre-computed results (e.g. named graphs
	 * already cached by the graph service) in the results panel.
	 * @param state The completed query execution state, including its `result`.
	 */
	registerCompletedQuery(state: SparqlQueryExecutionState): void {
		state.endTime = state.endTime ?? Date.now();

		this._logQueryExecution(state);

		this._onDidQueryExecutionEnd.fire(state);
	}

	/**
	 * Executes a SPARQL query directly against a connection without requiring a document.
	 * This method does not log the query in history and is intended for internal/programmatic use.
	 * @param query The SPARQL query string to execute.
	 * @param connection The SPARQL connection to execute against.
	 * @returns The query result based on the query type.
	 */
	async executeQueryOnConnection(query: string, connection: SparqlConnection): Promise<{ type: 'boolean'; value: boolean } | { type: 'quads'; data: string } | { type: 'bindings'; bindings: any[] } | null> {
		try {
			const source = await this._connectionService.getQuerySourceForConnection(connection);
			const result = await this._executeQueryOnSource(query, source);

			if (result.type === 'boolean') {
				return { type: 'boolean', value: result.value };
			} else if (result.type === 'quads') {
				const quads: Quad[] = [];

				for await (const quad of result.quads) {
					quads.push(quad);
				}

				const data = await this._resultSerializer.serializeQuadsToString(quads);

				return { type: 'quads', data };
			} else if (result.type === 'bindings') {
				const bindings: Bindings[] = [];

				for await (const binding of result.bindings) {
					bindings.push(binding);
				}

				return { type: 'bindings', bindings: bindings };
			}

			return null;
		} catch (error: any) {
			throw new Error(`Query execution failed: ${error.message}`);
		}
	}

	/**
	 * Executes a SPARQL query against a Comunica source and returns the raw result.
	 * @param query The SPARQL query string to execute.
	 * @param source The Comunica source to execute against.
	 * @param token Optional cancellation token.
	 * @returns The raw query result with type information.
	 */
	private async _executeQueryOnSource(
		query: string,
		source: any,
		token?: vscode.CancellationToken,
		onRawResponse?: (raw: Promise<SparqlRawResponse | undefined>) => void
	): Promise<
		| { type: 'boolean'; value: boolean }
		| { type: 'quads'; quads: AsyncIterator<Quad> }
		| { type: 'bindings'; bindings: AsyncIterator<Bindings> }
		| { type: 'none' }
	> {
		const options: any = {
			sources: [source],
			unionDefaultGraph: true
		};

		if (source.type === 'sparql') {
			const connection = source.connection;
			const credential = await this._credentialStorage.getCredential(connection.id);
			options.fetch = this._getFetchHandler(credential, onRawResponse);

			// Apply store-specific query-text rewriting for inference (e.g. reasoning pragmas).
			const inferenceEnabled = source.inferenceEnabled
				?? this._connectionService.getInferenceEnabled(connection.id);

			const queryPragma = this._storeConfigService.getStoreConfig(connection.storeType)?.inference?.queryPragma;

			if (queryPragma) {
				const pragma = (inferenceEnabled ? queryPragma.enabled : queryPragma.disabled)?.trim();

				if (pragma) {
					query = `${pragma}\n${query}`;
				}
			}
		}

		// Apply query timeout from configuration (0 means no timeout)
		const timeout = getConfig('sparql').get<number>('queryTimeout', 30000);

		if (timeout > 0) {
			options.timeout = timeout;
		}

		const preparedQuery = await new QueryEngine().query(query, options);

		if (preparedQuery.resultType === 'boolean') {
			const value = token
				? await withCancellation(preparedQuery.execute(), token)
				: await preparedQuery.execute();

			return { type: 'boolean', value };
		} else if (preparedQuery.resultType === 'quads') {
			const quads = await preparedQuery.execute();

			return { type: 'quads', quads };
		} else if (preparedQuery.resultType === 'bindings') {
			const bindings = await preparedQuery.execute();

			return { type: 'bindings', bindings };
		}

		return { type: 'none' };
	}

	_getFetchHandler(
		credential?: AuthCredential,
		onRawResponse?: (raw: Promise<SparqlRawResponse | undefined>) => void
	) {
		const getAuthHeader = this._getAuthHeaderProvider(credential);

		// Without an authorization header to inject and without a need to capture the raw
		// response, there is nothing to add over Comunica's default fetch.
		if (!getAuthHeader && !onRawResponse) {
			return undefined;
		}

		return async (input: RequestInfo | URL, init?: RequestInit) => {
			const headers = new Headers(init?.headers || {});

			if (getAuthHeader) {
				const authHeader = await getAuthHeader();

				if (authHeader) {
					headers.set("Authorization", authHeader);
				}
			}

			const response = await fetch(input, { ...init, headers });

			if (onRawResponse) {
				// Tee the body via `clone()` so the raw, unparsed response can be inspected
				// without disturbing the stream Comunica consumes. Best-effort capture.
				onRawResponse(this._readRawResponse(response.clone()));
			}

			return response;
		};
	}

	/**
	 * Builds a provider that resolves the `Authorization` header value for the given credential.
	 * Returns `undefined` when no usable credential is available (no credential, unknown type, or
	 * a Microsoft credential without an access token), in which case no header should be sent.
	 * @param credential The authentication credential, if any.
	 * @returns A function resolving the header value, or `undefined` if there is no usable credential.
	 */
	private _getAuthHeaderProvider(credential?: AuthCredential): (() => Promise<string | undefined>) | undefined {
		if (credential?.type === 'basic') {
			const encoded = btoa(`${credential.username}:${credential.password}`);
			return async () => `Basic ${encoded}`;
		}

		if (credential?.type === 'bearer') {
			const prefix = credential.prefix || 'Bearer';
			const token = credential.token;
			return async () => `${prefix} ${token}`;
		}

		if (credential?.type === 'microsoft') {
			const accessToken = credential.accessToken;

			if (!accessToken) {
				return undefined;
			}

			return async () => `Bearer ${accessToken}`;
		}

		if (credential?.type === 'entra-client-credentials') {
			const entraCredential = credential as EntraClientAuthCredential;
			const tokenService = new EntraClientCredentialService();
			return async () => `Bearer ${await tokenService.acquireToken(entraCredential)}`;
		}

		return undefined;
	}

	/**
	 * Reads a (cloned) HTTP response into a serializable raw-response record, truncating the
	 * body to {@link MAX_RAW_RESPONSE_LENGTH}. Best-effort: resolves to `undefined` on failure.
	 * @param response A cloned response whose body has not yet been consumed.
	 * @returns The captured raw response, or `undefined` if it could not be read.
	 */
	private async _readRawResponse(response: Response): Promise<SparqlRawResponse | undefined> {
		try {
			const text = await response.text();
			const truncated = text.length > MAX_RAW_RESPONSE_LENGTH;
			const body = truncated
				? text.slice(0, MAX_RAW_RESPONSE_LENGTH) + '\n\n… response truncated …'
				: text;

			return {
				url: response.url,
				status: response.status,
				statusText: response.statusText,
				contentType: response.headers.get('content-type') ?? undefined,
				body
			};
		} catch {
			return undefined;
		}
	}

	_getQueryType(query: string): SparqlQueryType | undefined {
		const lexingResult = new SparqlLexer().tokenize(query);

		for (const token of lexingResult.tokens) {
			switch (token.tokenType.name) {
				case RdfToken.ASK.name:
					return 'boolean';
				case RdfToken.SELECT.name:
					return 'bindings';
				case RdfToken.CONSTRUCT.name:
					return 'quads';
				case RdfToken.DESCRIBE.name:
					return 'quads';
				case RdfToken.FROM.name:
					return undefined;
				case RdfToken.WHERE.name:
					return undefined;
			}
		}
	}

	private _getQueryText(context: SparqlQueryExecutionState): string | undefined {
		if (context.query) {
			return context.query;
		} else if (context.notebookIri) {
			const notebook = vscode.workspace.notebookDocuments.find(
				n => n.uri.toString() === context.notebookIri
			);

			if (notebook) {
				const cell = notebook.cellAt(context.cellIndex || 0);

				return cell.document.getText();
			}
		} else {
			const document = vscode.workspace.textDocuments.find(
				d => d.uri.toString() === context.documentIri
			);

			if (document) {
				return document.getText();
			}
		}
	}

	/**
	 * Update the SPARQL history and fire the appropriate events when a query is executed.
	 * @param context The context of the SPARQL query execution.
	 */
	private async _logQueryExecutionStart(context: SparqlQueryExecutionState) {
		await this._logQueryExecution(context);

		this._onDidQueryExecutionStart.fire(context);
	}

	/**
	 * Update the SPARQL history and fire the appropriate events when a query finished executing.
	 * @param context The context of the SPARQL query execution.
	 */
	private async _logQueryExecutionEnd(context: SparqlQueryExecutionState) {
		await this._logQueryExecution(context);

		this._onDidQueryExecutionEnd.fire(context);
	}

	/**
	 * Tracks query execution in history and persists to storage.
	 */
	private async _logQueryExecution(context: SparqlQueryExecutionState) {
		const n = this._history.findIndex(q => q.documentIri === context.documentIri);

		if (n >= 0) {
			this._history.splice(n, 1);
		}

		this._history.unshift(context);

		this._onDidHistoryChange.fire();
	}

	/**
	 * Gets recent queries across all documents, ordered by execution time in descending order.
	 * @param limit The maximum number of recent queries to return.
	 * @returns A promise that resolves to an array of recent query entries.
	 */
	getQueryHistory(): SparqlQueryExecutionState[] {
		return this._history;
	}

	/**
	 * Clears the persisted query history.
	 */
	clearQueryHistory(): void {
		this._history.length = 0;

		this._persistQueryHistory();
	}
}
import * as vscode from 'vscode';
import { SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { QueryEngine } from "@comunica/query-sparql";
import { AsyncIterator } from 'asynciterator';
import { Bindings, Quad } from "@rdfjs/types";
import { mentor } from "@src/mentor";
import { WorkspaceUri } from "@src/workspace/workspace-uri";
import { CancellationError, withCancellation } from '@src/utilities/cancellation';
import { SparqlQueryExecutionState, SparqlQueryType } from "./sparql-query-state";
import { SparqlQueryResultSerializer } from './sparql-query-result-serializer';
import { SparqlConnectionService } from './sparql-connection-service';
import { SparqlConnection } from './sparql-connection';
import { AuthCredential } from './credential';

/**
 * The key for storing query history in local storage.
 */
const HISTORY_STORAGE_KEY = 'mentor.sparql.queryHistory';

/**
 * The maximum number of entries to keep in the query history.
 */
const HISTORY_MAX_ENTRIES = 10;

/**
 * A service for executing SPARQL queries against an RDF endpoint. The service
 * keeps a log of the executed queries in temporal order in memory, and upon
 * disposal, it saves the query history to a workspace-scoped local storage,
 * excluding unsaved documents. This query history is then restored when the 
 * service is instantiated.
 */
export class SparqlQueryService {
	private _initialized = false;

	private readonly _history: SparqlQueryExecutionState[] = [];

	private readonly _cancellationTokens = new Map<string, vscode.CancellationTokenSource>();

	private readonly _onDidHistoryChange = new vscode.EventEmitter<void>();

	private readonly _querySerializer = new SparqlQueryResultSerializer();

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

	constructor(private _connectionService: SparqlConnectionService) {
	}

	/**
	 * Load the query history from the workspace-scoped local storage.
	 */
	initialize() {
		if (this._initialized) return;

		for (const entry of this._loadQueryHistory()) {
			this._history.push(entry);
		}

		vscode.workspace.onDidCloseTextDocument((e) => this._onTextDocumentClosed(e));

		this._initialized = true;
	}

	/**
	 * Dispose the service and clean up resources.
	 */
	dispose() {
		this._onDidHistoryChange.dispose();

		this._initialized = false;
	}

	/**
	 * Handles the closing of a text document and removes unsaved queries from the history.
	 * @param document A text document.
	 */
	private _onTextDocumentClosed(document: vscode.TextDocument) {
		if (document.uri.scheme === 'untitled') {
			const i = this._history.findIndex(q => q.documentIri === document.uri.toString());

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
		const history = mentor.workspaceStorage.getValue<SparqlQueryExecutionState[]>(HISTORY_STORAGE_KEY, []);

		return history
			.filter(q => q)
			.slice(0, limit)
			.sort((a, b) => b.startTime - a.startTime);
	}

	private async _persistQueryHistory(): Promise<void> {
		// Filter the query history to exclude execution states that would not be valid after a restart.
		const filteredHistory = this._history
			.filter(q => q && !q.documentIri.startsWith('untitled'))
			.slice(0, HISTORY_MAX_ENTRIES);

		await mentor.workspaceStorage.setValue(HISTORY_STORAGE_KEY, filteredHistory);
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
		try {
			const query = this._getQueryText(context);

			if (!query) {
				throw new Error('Unable to retrieve query from the document: ' + context.documentIri);
			}

			this._cancellationTokens.set(context.id, tokenSource);

			this._logQueryExecutionStart(context);

			const documentIri = vscode.Uri.parse(context.documentIri);
			const source = await this._connectionService.getQuerySourceForDocument(documentIri);

			const result = await this._executeQueryOnSource(query, source, tokenSource.token);

			if (result.type === 'bindings') {
				context.result = await this._querySerializer.serializeBindings(context, result.bindings, tokenSource.token);
			} else if (result.type === 'boolean') {
				context.result = { type: 'boolean', value: result.value };
			} else if (result.type === 'quads') {
				context.result = {
					type: 'quads',
					mimeType: 'text/turtle',
					document: await this._querySerializer.serializeQuads(context, result.quads, tokenSource.token)
				};
			} else {
				context.result = undefined;
			}
		} catch (error: any) {
			context.error = {
				type: error.name || 'QueryError',
				message: error.message || 'Unknown error occurred while executing the query.',
				stack: error.stack || '',
				statusCode: error.statusCode || 500,
				cancelled: error instanceof CancellationError
			}
		}

		context.endTime = Date.now();

		this._logQueryExecutionEnd(context);
		this._persistQueryHistory();

		return context;
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

				const data = await this._querySerializer.serializeQuadsToString(quads);

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
		token?: vscode.CancellationToken
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
			const credential = await mentor.credentialStorageService.getCredential(connection.id);
			options.fetch = this._getFetchHandler(credential);
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

	_getFetchHandler(credential?: AuthCredential) {
		if (credential?.type === 'basic') {
			const username = credential.username;
			const password = credential.password;
			const encoded = btoa(`${username}:${password}`);

			return (input: RequestInfo | URL, init?: RequestInit) => {
				const headers = new Headers(init?.headers || {});
				headers.set("Authorization", `Basic ${encoded}`);

				return fetch(input, { ...init, headers });
			};
		}

		if (credential?.type === 'bearer') {
			throw new Error('Not implemented.');
		}

		return undefined;
	}

	_getQueryType(query: string): SparqlQueryType | undefined {
		const parser = new SparqlSyntaxParser();
		const result = parser.parse(query);

		for (const token of result?.tokens) {
			switch (token.tokenType?.name) {
				case 'ASK':
					return 'boolean';
				case 'SELECT':
					return 'bindings';
				case 'CONSTRUCT':
					return 'quads';
				case 'DESCRIBE':
					return 'quads';
				case 'FROM':
					return undefined;
				case 'WHERE':
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
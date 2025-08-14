import * as vscode from 'vscode';
import { Uri } from '@faubulous/mentor-rdf';
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import { BindingsStream } from '@comunica/types';
import { Bindings } from '@rdfjs/types';
import { mentor } from "@/mentor";
import { WorkspaceUri } from "@/workspace/workspace-uri";
import { NamespaceMap } from "@/utilities";
import { SparqlDocument } from '@/languages';
import { BindingsResult, SparqlQueryExecutionState } from "./sparql-query-state";

/**
 * The key for storing query history in local storage.
 */
const HISTORY_STORAGE_KEY = 'queryHistory.Sparql';

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

	private readonly _onDidHistoryChange = new vscode.EventEmitter<void>();

	/**
	 * Event that is triggered when the query history changes.
	 */
	onDidHistoryChange: vscode.Event<void> = this._onDidHistoryChange.event;

	/**
	 * Load the query history from the workspace-scoped local storage.
	 */
	initialize() {
		if (this._initialized) return;

		for (const entry of this._loadQueryHistory()) {
			this._history.push(entry);
		}

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
	 * Prepares a SPARQL query for execution.
	 * @param querySource The source document or notebook cell where the query is stored.
	 * @returns A new SparqlQueryContext instance.
	 */
	createQuery(querySource: vscode.TextDocument | vscode.NotebookCell): SparqlQueryExecutionState {
		if ('notebook' in querySource && querySource.notebook) {
			const cell = querySource as vscode.NotebookCell;
			const documentIri = cell.document.uri;

			return {
				documentIri: documentIri.toString(),
				workspaceIri: this._getWorkspaceUri(documentIri)?.toString(),
				notebookIri: cell.notebook.uri.toString(),
				cellIndex: cell.index,
				startTime: Date.now(),
				query: cell.document.getText()
			};
		} else {
			const document = querySource as vscode.TextDocument;
			const documentIri = document.uri;

			return {
				documentIri: documentIri.toString(),
				workspaceIri: this._getWorkspaceUri(documentIri)?.toString(),
				startTime: Date.now(),
				query: document.getText()
			};
		}
	}

	private _getWorkspaceUri(documentIri: vscode.Uri): vscode.Uri | undefined {
		if (documentIri.scheme === 'file') {
			return WorkspaceUri.toWorkspaceUri(documentIri);
		}
	}

	private _loadQueryHistory(limit: number = 10): SparqlQueryExecutionState[] {
		const history = mentor.workspaceStorage.getValue<SparqlQueryExecutionState[]>(HISTORY_STORAGE_KEY, []);

		return history
			.filter(q => q)
			.slice(0, limit)
			.sort((a, b) => b.startTime - a.startTime);
	}

	private async _saveQueryHistory(): Promise<void> {
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
	getQueryState(documentIri: string): SparqlQueryExecutionState | undefined {
		return this._history.find(q => q.documentIri === documentIri);
	}

	/**
	 * Update the SPARQL query state for a specific document IRI.
	 * @param state The SparqlQueryState to update or add to the history.
	 */
	updateQueryState(state: SparqlQueryExecutionState): void {
		const index = this._history.findIndex(q => q.documentIri === state.documentIri);

		if (index >= 0) {
			this._history[index] = state;

			this._saveQueryHistory();
		}
	}

	/**
	 * Removes the n-th item from the query history.
	 * @param index The index of the item to remove from the query history.
	 */
	removeQueryStateAt(index: number): void {
		if (index >= 0 && index < this._history.length) {
			this._history.splice(index, 1);

			this._saveQueryHistory();
		}
	}

	/**
	 * Executes a SPARQL query against the RDF store and returns the results.
	 * @param query The SPARQL query to execute.
	 * @param documentIri The IRI of the document where the query is run.
	 * @returns A promise that resolves to the results of the query.
	 */
	async executeQuery(context: SparqlQueryExecutionState): Promise<SparqlQueryExecutionState> {
		const source = mentor.store;
		const engine = new QueryEngine();

		try {
			const query = this._getQueryText(context);

			if (!query) {
				throw new Error('Unable to retrieve query from the document: ' + context.documentIri);
			}

			const result = await engine.queryBindings(query, {
				sources: [source],
				unionDefaultGraph: true
			});

			context.result = await this._serializeQueryResults(context, result);
		} catch (error: any) {
			context.error = {
				type: error.name || 'QueryError',
				message: error.message || 'Unknown error occurred while executing the query.',
				stack: error.stack || '',
				statusCode: error.statusCode || 500
			}
		}

		context.endTime = Date.now();

		this._logQueryExecution(context);

		this._saveQueryHistory();

		return context;
	}

	private _getQueryText(context: SparqlQueryExecutionState): string | undefined {
		if (context.notebookIri) {
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
	 * Serializes SPARQL query results into a format suitable for the webview.
	 * @param documentIri The IRI of the document where the query was run.
	 * @param bindingStream The SPARQL query results as a BindingsStream.
	 * @param limit The maximum number of results to serialize.
	 * @returns An object containing the serialized results.
	 */
	private async _serializeQueryResults(context: SparqlQueryExecutionState, bindingStream: BindingsStream): Promise<BindingsResult> {
		// Note: This evaluates the query results and collects the bindings.
		const bindings = await bindingStream.toArray();

		const namespaces = new Set<string>();
		const columns = this._parseSelectVariables(context, bindings);
		const rows: Record<string, any>[] = [];

		for (const binding of bindings) {
			const row: Record<string, any> = {};

			for (const column of columns) {
				const value = binding.get(column);

				if (value === undefined) {
					continue;
				}

				if (value.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(value.value));
				}

				row[column] = {
					termType: value.termType,
					value: value.value,
					// datatype: value.datatype ? value.datatype.value : undefined,
					// language: value.language || undefined
				};
			}

			rows.push(row);
		}

		const documentIri = context.documentIri;
		const namespaceMap: NamespaceMap = {};

		for (const iri of namespaces) {
			const prefix = mentor.prefixLookupService.getPrefixForIri(documentIri, iri, '');

			if (prefix !== '') {
				namespaceMap[iri] = prefix;
			}
		}

		return {
			type: 'bindings',
			columns,
			rows,
			namespaceMap
		};
	}

	/**
	 * Parses the query variables form the SELECT query in the order they were defined.
	 * @param context The SparqlQueryContext containing the query.
	 * @param bindingStream The SPARQL query results as a BindingsStream.
	 * @returns A set of variable names used in the query.
	 * @remarks This is needed because Comunica does not preserve the definition order of the variables in results.
	 */
	private _parseSelectVariables(context: SparqlQueryExecutionState, bindings: Bindings[]): Array<string> {
		const document = mentor.contexts[context.documentIri] as SparqlDocument;

		if (!document) {
			return [];
		}

		let result = new Array<string>();

		for (const token of document.tokens) {
			const type = token.tokenType?.name;

			if (type === 'VAR1' || type === 'VAR2') {
				result.push(token.image.substring(1));
			} else if (type === 'Star') {
				const vars = bindings.length > 0 ? Array.from(bindings[0].keys()) : [];

				result = vars.map(v => v.value);
				break;
			} else if (type === 'FROM' || type === 'WHERE') {
				break;
			}
		}

		return result;
	}

	/**
	 * Tracks query execution in history and persists to storage.
	 */
	private async _logQueryExecution(context: SparqlQueryExecutionState): Promise<void> {
		const n = this._history.findIndex(q => q.documentIri === context.documentIri);

		if (n >= 0) {
			this._history.splice(n, 1);
		}

		this._history.unshift(context);
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

		this._saveQueryHistory();
	}
}
import * as vscode from 'vscode';
import { SparqlSyntaxParser, Uri } from '@faubulous/mentor-rdf';
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import { Bindings, Quad } from '@rdfjs/types';
import { Store, Writer } from 'n3';
import { mentor } from "@/mentor";
import { WorkspaceUri } from "@/workspace/workspace-uri";
import { NamespaceMap } from "@/utilities";
import { SparqlDocument } from '@/languages';
import { BindingsResult, SparqlQueryExecutionState, SparqlQueryType } from "./sparql-query-state";
import { AsyncIterator } from 'asynciterator';
import { SparqlConnectionService } from './sparql-connection-service';

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
	 * Prepares a SPARQL query for execution.
	 * @param querySource The source document or notebook cell where the query is stored.
	 * @returns A new SparqlQueryContext instance.
	 */
	createQuery(querySource: vscode.TextDocument | vscode.NotebookCell): SparqlQueryExecutionState {
		let document: vscode.TextDocument;
		let cellIndex: number | undefined;
		let notebookIri: vscode.Uri | undefined;

		if ('notebook' in querySource && querySource.notebook) {
			const cell = querySource as vscode.NotebookCell;

			document = cell.document;
			notebookIri = cell.notebook.uri;
			cellIndex = cell.index;
		} else {
			document = querySource as vscode.TextDocument;
		}

		const query = document.getText();
		const queryType = this._getQueryType(query);
		const workspaceIri = WorkspaceUri.toWorkspaceUri(document.uri);

		return {
			documentIri: document.uri.toString(),
			workspaceIri: workspaceIri?.toString(),
			notebookIri: notebookIri?.toString(),
			cellIndex,
			query,
			queryType,
			startTime: Date.now()
		};
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
	getQueryState(documentIri: string): SparqlQueryExecutionState | undefined {
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
	 * Removes the n-th item from the query history and triggers the history change event.
	 * @param index The index of the item to remove from the query history.
	 */
	removeQueryStateAt(index: number): boolean {
		if (index >= 0 && index < this._history.length) {
			this._history.splice(index, 1);

			this._onDidHistoryChange.fire();

			this._persistQueryHistory();

			return true;
		}

		return false;
	}

	/**
	 * Executes a SPARQL query against the RDF store and returns the results.
	 * @param query The SPARQL query to execute.
	 * @param documentIri The IRI of the document where the query is run.
	 * @returns A promise that resolves to the results of the query.
	 */
	async executeQuery(context: SparqlQueryExecutionState): Promise<SparqlQueryExecutionState> {
		try {
			const query = this._getQueryText(context);

			if (!query) {
				throw new Error('Unable to retrieve query from the document: ' + context.documentIri);
			}

			this._logQueryExecutionStart(context);

			const documentIri = vscode.Uri.parse(context.documentIri);
            const source = await this._connectionService.getQuerySourceForDocument(documentIri);

			const result = await new QueryEngine().query(query, {
				sources: [source],
				unionDefaultGraph: true
			});

			if (result.resultType === 'bindings') {
				const bindings = await result.execute();
				context.result = await this._serializeBindings(context, bindings);
			} else if (result.resultType === 'boolean') {
				const value = await result.execute();
				context.result = { type: 'boolean', value: value };
			} else if (result.resultType === 'quads') {
				const quads = await result.execute();
				context.result = {
					type: 'quads',
					mimeType: 'text/turtle',
					document: await this._serializeQuads(context, quads)
				};
			} else {
				context.result = undefined;
			}
		} catch (error: any) {
			context.error = {
				type: error.name || 'QueryError',
				message: error.message || 'Unknown error occurred while executing the query.',
				stack: error.stack || '',
				statusCode: error.statusCode || 500
			}
		}

		context.endTime = Date.now();

		this._logQueryExecutionEnd(context);

		this._persistQueryHistory();

		return context;
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
	private async _serializeBindings(context: SparqlQueryExecutionState, bindingStream: AsyncIterator<Bindings>): Promise<BindingsResult> {
		// Note: This evaluates the query results and collects the bindings.
		const bindings = await bindingStream.toArray();

		const namespaces = new Set<string>();
		const parsedColumns = this._parseSelectVariables(context, bindings);
		const rows: Record<string, any>[] = [];

		for (const binding of bindings) {
			const row: Record<string, any> = {};

			for (const column of parsedColumns) {
				const value = binding.get(column);

				if (value === undefined) {
					continue;
				}

				if (value.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(value.value));
				}

				const datatype = value.termType === 'Literal' ? value.datatype.value : undefined;
				const language = value.termType === 'Literal' ? value.language : undefined;

				row[column] = {
					termType: value.termType,
					value: value.value,
					datatype: datatype,
					language: language
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
			columns: parsedColumns,
			rows,
			namespaceMap
		};
	}

	private async _serializeQuads(context: SparqlQueryExecutionState, quadStream: AsyncIterator<Quad>): Promise<string> {
		try {
			const quads = await quadStream.toArray();

			if (quads.length === 0) {
				return '';
			}

			// TODO: Request quads from communica instead of manually filtering the triples.
			const store = new Store();

			// Add all quads to the writer
			for (const q of quads) {
				store.addQuad(q.subject, q.predicate, q.object);
			}

			// Get namespace prefixes for better formatting
			const documentIri = context.documentIri;
			const prefixMap: Record<string, string> = {};

			// Collect unique namespace IRIs from the quads
			const namespaces = new Set<string>();

			for (const quad of quads) {
				if (quad.subject.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(quad.subject.value));
				}
				if (quad.predicate.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(quad.predicate.value));
				}
				if (quad.object.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(quad.object.value));
				}
			}

			// Build prefix map
			for (const iri of namespaces) {
				const prefix = mentor.prefixLookupService.getPrefixForIri(documentIri, iri, '');

				if (prefix !== '') {
					prefixMap[prefix] = iri;
				}
			}

			// Create N3 writer with prefixes
			const writer = new Writer({
				format: 'text/turtle',
				prefixes: prefixMap
			});

			writer.addQuads(store.toArray());

			// Return the serialized Turtle string
			return new Promise<string>((resolve, reject) => {
				writer.end((error, result) => {
					if (error) {
						reject(error);
					} else {
						resolve(result);
					}
				});
			});
		} catch (error) {
			console.error('Error serializing quads to Turtle:', error);
			return '';
		}
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
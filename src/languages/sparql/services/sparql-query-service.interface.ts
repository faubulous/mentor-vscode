import * as vscode from 'vscode';
import { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';

/**
 * Interface for the SparqlQueryService.
 */
export interface ISparqlQueryService {
	/**
	 * Event that is triggered when the query history changes.
	 */
	readonly onDidHistoryChange: vscode.Event<void>;

	/**
	 * Event that is triggered before a SPARQL query is about to be executed.
	 */
	readonly onDidQueryExecutionStart: vscode.Event<SparqlQueryExecutionState>;

	/**
	 * Event that is triggered when a SPARQL query execution has ended with any result.
	 */
	readonly onDidQueryExecutionEnd: vscode.Event<SparqlQueryExecutionState>;

	/**
	 * Creates a new SPARQL query state from a query string.
	 * @param querySource The source document or notebook cell where the query is stored.
	 * @param query The SPARQL query string.
	 * @returns A new SparqlQueryExecutionState instance.
	 */
	createQuery(querySource: vscode.TextDocument | vscode.NotebookCell, query: string): SparqlQueryExecutionState;

	/**
	 * Creates a new SPARQL query state from a document or notebook cell.
	 * @param querySource The source document or notebook cell where the query is stored.
	 * @returns A new SparqlQueryContext instance.
	 */
	createQueryFromDocument(querySource: vscode.TextDocument | vscode.NotebookCell): SparqlQueryExecutionState;

	/**
	 * Get the SPARQL query state for a specific document IRI.
	 * @param documentIri The IRI of the document to retrieve the query state for.
	 * @returns The SparqlQueryState for the specified document, or `undefined` if not found.
	 */
	getQueryStateForDocument(documentIri: string): SparqlQueryExecutionState | undefined;

	/**
	 * Removes a SPARQL query state from the history and triggers the history change event.
	 * @param state The SparqlQueryState to remove.
	 */
	removeQueryState(state: SparqlQueryExecutionState): void;

	/**
	 * Cancels a running SPARQL query execution.
	 * @param queryStateID Id of the query execution state.
	 * @returns `true` if the query was successfully cancelled, `false` otherwise.
	 */
	cancelQuery(queryStateID: string): boolean;

	/**
	 * Removes the n-th item from the query history and triggers the history change event.
	 * @param index The index of the item to remove from the query history.
	 * @returns `true` if the item was removed, `false` otherwise.
	 */
	removeQueryStateAt(index: number): boolean;

	/**
	 * Executes a SPARQL query against the RDF store and returns the results.
	 * @param context The query execution context.
	 * @param tokenSource A cancellation token source to cancel the query execution.
	 * @returns A promise that resolves to the results of the query.
	 */
	executeQuery(context: SparqlQueryExecutionState, tokenSource?: vscode.CancellationTokenSource): Promise<SparqlQueryExecutionState>;

	/**
	 * Executes a SPARQL query directly against a connection without requiring a document.
	 * @param query The SPARQL query string to execute.
	 * @param connection The SPARQL connection to execute against.
	 * @returns The query result based on the query type.
	 */
	executeQueryOnConnection(query: string, connection: SparqlConnection): Promise<{ type: 'boolean'; value: boolean } | { type: 'quads'; data: string } | { type: 'bindings'; bindings: any[] } | null>;

	/**
	 * Gets recent queries across all documents, ordered by execution time in descending order.
	 * @returns An array of recent query entries.
	 */
	getQueryHistory(): SparqlQueryExecutionState[];

	/**
	 * Clears the persisted query history.
	 */
	clearQueryHistory(): void;
}

import * as vscode from 'vscode';
import { AsyncIterator } from 'asynciterator';
import { Bindings, Quad } from '@rdfjs/types';
import { BindingsResult, SparqlQueryExecutionState } from '@src/services/core/sparql-query-state';

/**
 * Interface for the SparqlQueryResultSerializer.
 */
export interface ISparqlQueryResultSerializer {
	/**
	 * Serializes SPARQL query results into a format suitable for the webview.
	 * @param context The query execution context.
	 * @param bindingStream The SPARQL query results as a BindingsStream.
	 * @param token The cancellation token.
	 * @returns An object containing the serialized results.
	 */
	serializeBindings(
		context: SparqlQueryExecutionState,
		bindingStream: AsyncIterator<Bindings>,
		token: vscode.CancellationToken
	): Promise<BindingsResult>;

	/**
	 * Serializes a stream of quads into Turtle format.
	 * @param context The query execution context.
	 * @param quadStream The SPARQL query results as a QuadStream.
	 * @param token The cancellation token.
	 * @returns A string containing the serialized Turtle document.
	 */
	serializeQuads(
		context: SparqlQueryExecutionState,
		quadStream: AsyncIterator<Quad>,
		token: vscode.CancellationToken
	): Promise<string>;

	/**
	 * Serializes an array of quads into Turtle format without requiring a context.
	 * @param quads The array of quads to serialize.
	 * @param namespaces Optional namespace map for prefix resolution.
	 * @returns A string containing the serialized Turtle document.
	 */
	serializeQuadsToString(quads: Quad[], namespaces?: Record<string, string>): Promise<string>;
}

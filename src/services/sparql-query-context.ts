import * as vscode from 'vscode';
import { PrefixMap } from "@/utilities";
import { Term } from "@rdfjs/types";

/**
 * The state of a SPARQL query execution context.
 */
export class SparqlQueryContext {
	/**
	 * The TextDocument where the SPARQL query is defined.
	 */
	document: vscode.TextDocument;

	/**
	 * The NotebookCell associated with the SPARQL query, if any.
	 */
	cell: vscode.NotebookCell | undefined;

	/**
	 * The time when the query was executed in milliseconds since midnight, January 1, 1970 UTC.
	 */
	startTime: number;

	/**
	 * The time when the query finished executing in milliseconds since midnight, January 1, 1970 UTC.
	 */
	endTime?: number;

	/**
	 * The error that occurred during query execution, if any.
	 */
	error?: any;

	/**
	 * The type of the results, e.g., 'bindings'.
	 */
	resultType: 'bindings' | 'boolean' | 'graph';

	result?: BindingsResult | boolean | string;

	constructor(document: vscode.TextDocument, cell?: vscode.NotebookCell) {
		this.document = document;
		this.startTime = Date.now();
		this.resultType = 'bindings';
		this.cell = cell;
	}
}

/**
 * Represents the results of a SPARQL query that returns bindings.
 */
export interface BindingsResult {
	/**
	 * The column headers of the result table.
	 */
	columns: string[];

	/**
	 * The rows of the result table containing the data.
	 */
	rows: Record<string, Term>[];

	/**
	 * A map of namespace IRIs to prefixes defined in the document or the workspace.
	 */
	namespaceMap: PrefixMap;
}
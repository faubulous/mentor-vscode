import * as vscode from 'vscode';
import { PrefixMap } from "@/utilities";
import { Term } from "@rdfjs/types";

/**
 * The state of a SPARQL query execution context.
 */
export class SparqlQueryContext {
	/**
	 * The TextDocument where the SPARQL query is defined. In case of a Notebook, this 
	 * is the IRI of the document that is associated with the cell.
	 */
	documentIri: string;

	/**
	 * The IRI of the notebook file where the SPARQL query is run, if applicable.
	 */
	notebookIri?: string;

	/**
	 * Id of the notebook cell associated with the SPARQL query, if any.
	 */
	cellIndex?: number;

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

	constructor(querySource: vscode.TextDocument | vscode.NotebookCell) {
		if ('notebook' in querySource && querySource.notebook) {
			const cell = querySource as vscode.NotebookCell;

			this.documentIri = cell.document.uri.toString();
			this.notebookIri = cell.notebook.uri.toString();
			this.cellIndex = cell.index;
		} else {
			const document = querySource as vscode.TextDocument;

			this.documentIri = document.uri.toString();
		}

		this.startTime = Date.now();
		this.resultType = 'bindings';
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
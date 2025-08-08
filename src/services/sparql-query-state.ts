import { PrefixMap } from "@/utilities";
import { Term } from "@rdfjs/types";
import { getFileName } from "@/utilities/uri";

/**
 * The state of a SPARQL query execution.
 */
export interface SparqlQueryExecutionState {
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
	 * The results of the query execution, if any.
	 */
	result?: SparqlQueryResult;

	/**
	 * The SPARQL query text.
	 */
	query?: string;
}

/**
 * Get the formatted file name of the associated document or notebook cell.
 */
export function getDisplayName(queryState: SparqlQueryExecutionState): string {
	if (queryState.notebookIri && queryState.cellIndex) {
		return getFileName(queryState.documentIri).split('#')[0] + ':Cell-' + queryState.cellIndex;
	} else {
		return getFileName(queryState.documentIri);
	}
}

export interface SparqlQueryResult {
	/**
	 * The type of the result, which can be 'bindings', 'boolean', or 'graph'.
	 */
	type: 'bindings' | 'boolean' | 'graph';
}

/**
 * Represents the results of a SPARQL query that returns bindings.
 */
export interface BindingsResult extends SparqlQueryResult {
	/**
	 * The type of the result, which is always 'bindings' for SELECT queries.
	 */
	type: 'bindings';

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

export interface BooleanResult extends SparqlQueryResult {
	/**
	 * The type of the result, which is always 'boolean' for ASK queries.
	 */
	type: 'boolean';

	/**
	 * Boolean result value for ASK queries.
	 */
	value: boolean;
}

export interface GraphResult extends SparqlQueryResult {
	/**
	 * The type of the result, which is always 'graph' for CONSTRUCT queries.
	 */
	type: 'graph';

	/**
	 * The returned RDF document in the given serialization format.
	 */
	document: string;

	/**
	 * The MIME type of the returned document.
	 */
	mimeType: string;
}
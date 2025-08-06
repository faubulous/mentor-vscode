import { PrefixMap } from "@/utilities";
import { Term } from "@rdfjs/types";

/**
 * The state of a SPARQL query execution.
 */
export interface SparqlQueryState {
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

	/**
	 * The results of the query execution, if any.
	 */
	result?: BindingsResult | boolean | string;

	/**
	 * The SPARQL query text.
	 */
	query: string;
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
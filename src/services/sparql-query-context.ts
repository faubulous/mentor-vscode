import { PrefixMap } from "@/utilities";
import { Term } from "@rdfjs/types";

/**
 * The state of a SPARQL query execution context.
 */
export class SparqlQueryContext {
	/**
	 * The IRI of the document where the query is stored.
	 */
	documentIri: string;

	/**
	 * The SPARQL query that was executed.
	 */
	query: string;

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

	constructor(documentIri: string, query: string) {
		this.documentIri = documentIri;
		this.query = query;
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
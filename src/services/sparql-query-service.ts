import { BindingsStream } from '@comunica/types';
import { Uri } from '@faubulous/mentor-rdf';
import { mentor } from "@/mentor";
import { NamespaceMap, PrefixMap } from "@/utilities";
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import { Term } from "@rdfjs/types";

/**
 * A service for executing SPARQL queries against an RDF endpoint.
 */
export class SparqlQueryService {
	/**
	 * Executes a SPARQL query against the RDF store and returns the results.
	 * @param query The SPARQL query to execute.
	 * @param documentIri The IRI of the document where the query is run.
	 * @returns A promise that resolves to the results of the query.
	 */
	async executeQuery(query: string, documentIri: string): Promise<SparqlQueryResults> {
		const source = mentor.store;
		const engine = new QueryEngine();

		const result = await engine.queryBindings(query, {
			sources: [source],
			unionDefaultGraph: true
		});

		return {
			... await this._serializeQueryResults(documentIri, result),
			type: 'bindings',
			documentIri: documentIri,
			query: query
		};
	}

	/**
	 * Serializes SPARQL query results into a format suitable for the webview.
	 * @param documentIri The IRI of the document where the query was run.
	 * @param bindings The SPARQL query results as a BindingsStream.
	 * @param limit The maximum number of results to serialize.
	 * @returns An object containing the serialized results.
	 */
	private async _serializeQueryResults(documentIri: string, bindings: BindingsStream, limit: number = 100) {
		const namespaces = new Set<string>();
		const columns = new Set<string>();
		const rows: Record<string, any>[] = [];

		for (const binding of await bindings.toArray({ limit })) {
			const row: Record<string, any> = {};

			for (const [key, value] of binding) {
				columns.add(key.value);

				if (value.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(value.value));
				}

				row[key.value] = {
					termType: value.termType,
					value: value.value,
					// datatype: value.datatype ? value.datatype.value : undefined,
					// language: value.language || undefined
				};
			}

			rows.push(row);
		}

		const namespaceMap: NamespaceMap = {};

		for (const iri of namespaces) {
			const prefix = mentor.prefixLookupService.getPrefixForIri(documentIri, iri, '');

			if (prefix !== '') {
				namespaceMap[iri] = prefix;
			}
		}

		return { columns: Array.from(columns), rows, namespaceMap };
	}
}

/**
 * The results of a SPARQL query.
 */
export interface SparqlQueryResults {
	/**
	 * The IRI of the document where the query is stored.
	 */
	documentIri: string;

	/**
	 * The SPARQL query that was executed.
	 */
	query: string;

	/**
	 * The type of the results, e.g., 'bindings'.
	 */
	type: 'bindings' | 'boolean' | 'graph';

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
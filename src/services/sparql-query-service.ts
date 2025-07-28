import { BindingsStream } from '@comunica/types';
import { Uri } from '@faubulous/mentor-rdf';
import { mentor } from "@/mentor";
import { NamespaceMap } from "@/utilities";
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import { SparqlQueryContext } from "@/services";
import { stat } from 'fs';

/**
 * A service for executing SPARQL queries against an RDF endpoint.
 */
export class SparqlQueryService {
	/**
	 * Prepares a SPARQL query for execution.
	 * @param documentIri The IRI of the document where the query is stored.
	 * @param query The SPARQL query string to execute.
	 * @returns A new SparqlQueryContext instance.
	 */
	prepareQuery(documentIri: string, query: string): SparqlQueryContext {
		return new SparqlQueryContext(documentIri, query);
	}

	/**
	 * Executes a SPARQL query against the RDF store and returns the results.
	 * @param query The SPARQL query to execute.
	 * @param documentIri The IRI of the document where the query is run.
	 * @returns A promise that resolves to the results of the query.
	 */
	async executeQuery(context: SparqlQueryContext): Promise<SparqlQueryContext> {
		const source = mentor.store;
		const engine = new QueryEngine();

		try {
			const result = await engine.queryBindings(context.query, {
				sources: [source],
				unionDefaultGraph: true
			});

			const serialized = await this._serializeQueryResults(context.documentIri, result);

			context.resultType = 'bindings';
			context.result = serialized;
		} catch (error: any) {
			context.error = {
				type: error.name || 'QueryError',
				message: error.message || 'Unknown error occurred while executing the query.',
				stack: error.stack || '',
				statusCode: error.statusCode || 500
			}
		}

		context.endTime = Date.now();

		return context;
	}

	/**
	 * Serializes SPARQL query results into a format suitable for the webview.
	 * @param documentIri The IRI of the document where the query was run.
	 * @param bindingStream The SPARQL query results as a BindingsStream.
	 * @param limit The maximum number of results to serialize.
	 * @returns An object containing the serialized results.
	 */
	private async _serializeQueryResults(documentIri: string, bindingStream: BindingsStream, limit: number = 100) {
		const namespaces = new Set<string>();
		const columns = new Set<string>();
		const rows: Record<string, any>[] = [];

		const bindings = await bindingStream.toArray();

		for (const binding of bindings) {
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

		return {
			columns: Array.from(columns),
			rows,
			namespaceMap
		};
	}
}
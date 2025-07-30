import * as vscode from 'vscode';
import { BindingsStream } from '@comunica/types';
import { Bindings } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { mentor } from "@/mentor";
import { NamespaceMap } from "@/utilities";
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import { SparqlQueryContext } from "@/services";
import { SparqlDocument } from '@/languages';

/**
 * A service for executing SPARQL queries against an RDF endpoint.
 */
export class SparqlQueryService {
	/**
	 * Prepares a SPARQL query for execution.
	 * @param document The TextDocument where the query is stored.
	 * @returns A new SparqlQueryContext instance.
	 */
	prepareQuery(document: vscode.TextDocument, cell: vscode.NotebookCell | undefined): SparqlQueryContext {
		return new SparqlQueryContext(document, cell);
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
			const query = context.document.getText();
			const result = await engine.queryBindings(query, {
				sources: [source],
				unionDefaultGraph: true
			});

			const serialized = await this._serializeQueryResults(context, result);

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
	private async _serializeQueryResults(context: SparqlQueryContext, bindingStream: BindingsStream) {
		// Note: This evaluates the query results and collects the bindings.
		const bindings = await bindingStream.toArray();

		const namespaces = new Set<string>();
		const columns = this._parseSelectVariables(context, bindings);
		const rows: Record<string, any>[] = [];

		for (const binding of bindings) {
			const row: Record<string, any> = {};

			for (const column of columns) {
				const value = binding.get(column);

				if (value === undefined) {
					continue;
				}

				if (value.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(value.value));
				}

				row[column] = {
					termType: value.termType,
					value: value.value,
					// datatype: value.datatype ? value.datatype.value : undefined,
					// language: value.language || undefined
				};
			}

			rows.push(row);
		}

		const documentIri = context.document.uri.toString();
		const namespaceMap: NamespaceMap = {};

		for (const iri of namespaces) {
			const prefix = mentor.prefixLookupService.getPrefixForIri(documentIri, iri, '');

			if (prefix !== '') {
				namespaceMap[iri] = prefix;
			}
		}

		return {
			columns,
			rows,
			namespaceMap
		};
	}

	/**
	 * Parses the query variables form the SELECT query in the order they were defined.
	 * @param context The SparqlQueryContext containing the query.
	 * @param bindingStream The SPARQL query results as a BindingsStream.
	 * @returns A set of variable names used in the query.
	 */
	private _parseSelectVariables(context: SparqlQueryContext, bindings: Bindings[]): Array<string> {
		const document = mentor.getDocumentContext(context.document, SparqlDocument);

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
}
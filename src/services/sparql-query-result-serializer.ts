import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { Store, Writer } from 'n3';
import { Uri } from '@faubulous/mentor-rdf';
import { AsyncIterator } from 'asynciterator';
import { Bindings, Quad } from "@rdfjs/types";
import { BindingsResult, SparqlQueryExecutionState } from "./sparql-query-state";
import { toArrayWithCancellation } from '@src/utilities/cancellation';
import { NamespaceMap } from '@src/utilities';
import { SparqlVariableParser } from './sparql-variable-parser';

/**
 * Handler for serializing SPARQL query results.
 */
export class SparqlQueryResultSerializer {
	/**
	 * Instance of SparqlVariableParser for parsing variable names from SELECT queries.
	 */
	private readonly _variableParser = new SparqlVariableParser();

	/**
	 * Serializes SPARQL query results into a format suitable for the webview.
	 * @param documentIri The IRI of the document where the query was run.
	 * @param bindingStream The SPARQL query results as a BindingsStream.
	 * @param limit The maximum number of results to serialize.
	 * @returns An object containing the serialized results.
	 */
	async serializeBindings(
		context: SparqlQueryExecutionState,
		bindingStream: AsyncIterator<Bindings>,
		token: vscode.CancellationToken
	): Promise<BindingsResult> {
		// Note: This evaluates the query results and collects the bindings.
		const bindings = await toArrayWithCancellation(bindingStream, token);
		const parsedColumns: string[] = [];

		if (context.query) {
			// Parse the variables from select queries in the order they were defined.
			const variables = this._variableParser.parseSelectVariables(context.query);

			parsedColumns.push(...variables);
		}

		const namespaces = new Set<string>();
		const rows: Record<string, any>[] = [];

		for (const binding of bindings) {
			const row: Record<string, any> = {};

			for (const [key, value] of binding) {
				if (value.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(value.value));
				}

				const datatype = value.termType === 'Literal' ? value.datatype.value : undefined;
				const language = value.termType === 'Literal' ? value.language : undefined;

				if (!parsedColumns.includes(key.value)) {
					parsedColumns.push(key.value);
				}

				row[key.value] = {
					termType: value.termType,
					value: value.value,
					datatype: datatype,
					language: language
				};
			}

			rows.push(row);
		}

		const documentIri = context.documentIri;
		const namespaceMap: NamespaceMap = {};

		for (const iri of namespaces) {
			const prefix = mentor.prefixLookupService.getPrefixForIri(documentIri, iri, '');

			if (prefix !== '') {
				namespaceMap[iri] = prefix;
			}
		}

		const result: BindingsResult = {
			type: 'bindings',
			columns: parsedColumns,
			rows,
			namespaceMap
		};

		return result;
	}

	/**
	 * Serializes a stream of quads into Turtle format.
	 * @param context The query execution context.
	 * @param quadStream The SPARQL query results as a QuadStream.
	 * @param token The cancellation token.
	 * @returns A string containing the serialized Turtle document.
	 */
	async serializeQuads(
		context: SparqlQueryExecutionState,
		quadStream: AsyncIterator<Quad>,
		token: vscode.CancellationToken
	): Promise<string> {
		try {
			const quads = await toArrayWithCancellation(quadStream, token);

			if (quads.length === 0) {
				return '';
			}

			// TODO: Request quads from communica instead of manually filtering the triples.
			const store = new Store();

			// Add all quads to the writer
			for (const q of quads) {
				store.addQuad(q.subject, q.predicate, q.object);
			}

			// Get namespace prefixes for better formatting
			const documentIri = context.documentIri;
			const prefixMap: Record<string, string> = {};

			// Collect unique namespace IRIs from the quads
			const namespaces = new Set<string>();

			for (const quad of quads) {
				if (quad.subject.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(quad.subject.value));
				}
				if (quad.predicate.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(quad.predicate.value));
				}
				if (quad.object.termType === 'NamedNode') {
					namespaces.add(Uri.getNamespaceIri(quad.object.value));
				}
			}

			// Build prefix map
			for (const iri of namespaces) {
				const prefix = mentor.prefixLookupService.getPrefixForIri(documentIri, iri, '');

				if (prefix !== '') {
					prefixMap[prefix] = iri;
				}
			}

			// Create N3 writer with prefixes
			const writer = new Writer({
				format: 'text/turtle',
				prefixes: prefixMap
			});

			writer.addQuads(store.toArray());

			// Return the serialized Turtle string
			return new Promise<string>((resolve, reject) => {
				writer.end((error, result) => {
					if (error) {
						reject(error);
					} else {
						resolve(result);
					}
				});
			});
		} catch (error) {
			console.error('Error serializing quads to Turtle:', error);
			return '';
		}
	}
}
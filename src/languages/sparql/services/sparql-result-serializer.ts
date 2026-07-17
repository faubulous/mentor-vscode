import * as vscode from 'vscode';
import { AsyncIterator } from 'asynciterator';
import { Uri } from '@faubulous/mentor-rdf';
import { rdfDataFactory } from '@src/utilities/rdf';
import { SparqlLexer, SparqlParser, SparqlVariableParser } from '@faubulous/mentor-rdf-parsers';
import { SerializationOptions, termToString, TurtleSerializer } from '@faubulous/mentor-rdf-serializers';
import { Bindings, Quad, Term } from "@rdfjs/types";
import { IPrefixLookupService } from '@src/services/document';
import { BindingsResult, SparqlQueryExecutionState } from "./sparql-query-state";
import { toArrayWithCancellation } from '@src/utilities/vscode/cancellation';
import { resolveFormattingConfig } from '@src/utilities/vscode/config';
import { NamespaceMap } from '@src/utilities';

/**
 * Handler for serializing SPARQL query results.
 */
export class SparqlResultSerializer {
	constructor(private readonly _prefixLookupService: IPrefixLookupService) { }

	/**
	 * Dedupes triples and drops named-graph terms: Turtle has no graphs, and
	 * the serializer would skip named-graph quads outright.
	 */
	private _prepareQuads(quads: Quad[]): Quad[] {
		const unique = new Map<string, Quad>();

		for (const q of quads) {
			const key = `${termToString(q.subject)} ${termToString(q.predicate)} ${termToString(q.object)}`;

			if (!unique.has(key)) {
				unique.set(key, q.graph.termType === 'DefaultGraph'
					? q
					: rdfDataFactory.quad(q.subject as any, q.predicate as any, q.object as any));
			}
		}

		return [...unique.values()];
	}

	/**
	 * Builds pretty-printing serializer options from the `mentor.formatting.*`
	 * settings, mirroring the Format Document defaults. Blank nodes are
	 * relabeled so store-internal ids do not leak into exports.
	 */
	private _buildTurtleOptions(prefixes: Record<string, string>): SerializationOptions {
		return {
			prefixes,
			directiveStyle: 'turtle',
			// prettyPrint gates blank-line and inline-blank-node formatting in the
			// serializer; set it explicitly so exports never depend on the library default.
			prettyPrint: true,
			maxLineWidth: resolveFormattingConfig('turtle', 'maxLineWidth', 120),
			spaceBeforePunctuation: resolveFormattingConfig('turtle', 'spaceBeforePunctuation', true),
			blankLinesBetweenSubjects: resolveFormattingConfig('turtle', 'blankLinesBetweenSubjects', true),
			relabelBlankNodes: true,
		};
	}

	/**
	 * Serializes SPARQL query results into a format suitable for the webview.
	 * @param documentIri The IRI of the document where the query was run.
	 * @param bindingStream The SPARQL query results as a BindingsStream.
	 * @param limit The maximum number of results to serialize.
	 * @returns An object containing the serialized results.
	 */
	async serializeBindings(context: SparqlQueryExecutionState, bindingStream: AsyncIterator<Bindings>, token: vscode.CancellationToken): Promise<BindingsResult> {
		// Note: This evaluates the query results and collects the bindings.
		const bindings = await toArrayWithCancellation(bindingStream, token);
		const parsedColumns: string[] = [];

		if (context.query) {
			const lexResult = new SparqlLexer().tokenize(context.query);
			const cst = new SparqlParser().parse(lexResult.tokens);

			// Parse the variables from select queries in the order they were defined.
			const variables = new SparqlVariableParser().getSelectedVariables(cst);

			parsedColumns.push(...variables);
		}

		const namespaces = new Set<string>();
		const rows: Record<string, any>[] = [];

		const serializeTerm = (value: Term): Record<string, any> => {
			const term: Record<string, any> = {
				termType: value.termType,
				value: value.value,
			};

			if (value.termType === 'NamedNode') {
				namespaces.add(Uri.getNamespaceIri(value.value));
			} else if (value.termType === 'Literal') {
				term.datatype = { termType: 'NamedNode', value: value.datatype.value };
				term.language = value.language;
			} else if (value.termType === 'Quad') {
				term.subject = serializeTerm(value.subject);
				term.predicate = serializeTerm(value.predicate);
				term.object = serializeTerm(value.object);
			}

			return term;
		};

		for (const binding of bindings) {
			const row: Record<string, any> = {};

			for (const [key, value] of binding) {
				if (!parsedColumns.includes(key.value)) {
					parsedColumns.push(key.value);
				}

				row[key.value] = serializeTerm(value);
			}

			rows.push(row);
		}

		const documentIri = context.documentIri ?? '';
		const namespaceMap: NamespaceMap = {};

		for (const iri of namespaces) {
			const prefix = this._prefixLookupService.getPrefixForIri(documentIri, iri, '\0');

			if (prefix !== '\0') {
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
	 * Builds a bindings result from a list of IRIs for a single column, without
	 * executing a query. Used to render already-cached data (e.g. auto-loaded
	 * named graphs) in the standard results table.
	 * @param query The SPARQL query the IRIs correspond to; used to derive the column name.
	 * @param iris The IRIs to render, one per row.
	 * @param documentIri The IRI of the document used for prefix resolution.
	 * @returns A BindingsResult mirroring the shape produced by {@link serializeBindings}.
	 */
	serializeIriList(query: string, iris: string[], documentIri: string = ''): BindingsResult {
		let column = 'graph';

		try {
			const lexResult = new SparqlLexer().tokenize(query);
			const cst = new SparqlParser().parse(lexResult.tokens);
			const variables = new SparqlVariableParser().getSelectedVariables(cst);

			if (variables.length > 0) {
				column = variables[0];
			}
		} catch {
			// Keep the default column name if the query cannot be parsed.
		}

		const namespaceMap: NamespaceMap = {};
		const rows: Record<string, any>[] = [];

		for (const iri of iris) {
			const namespace = Uri.getNamespaceIri(iri);
			const prefix = this._prefixLookupService.getPrefixForIri(documentIri, namespace, '\0');

			if (prefix !== '\0') {
				namespaceMap[namespace] = prefix;
			}

			rows.push({ [column]: { termType: 'NamedNode', value: iri } });
		}

		return {
			type: 'bindings',
			columns: [column],
			rows,
			namespaceMap
		};
	}

	/**
	 * Serializes a stream of quads into Turtle format.
	 * @param context The query execution context.
	 * @param quadStream The SPARQL query results as a QuadStream.
	 * @param token The cancellation token.
	 * @returns A string containing the serialized Turtle document.
	 */
	async serializeQuads(context: SparqlQueryExecutionState, quadStream: AsyncIterator<Quad>, token: vscode.CancellationToken): Promise<string> {
		try {
			const inputQuads = await toArrayWithCancellation(quadStream, token);

			if (inputQuads.length === 0) {
				return '';
			}

			// Get namespace prefixes for better formatting
			const documentIri = context.documentIri ?? '';
			const prefixMap: Record<string, string> = {};

			// Collect unique namespace IRIs from the quads
			const namespaces = new Set<string>();

			for (const quad of inputQuads) {
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
				const prefix = this._prefixLookupService.getPrefixForIri(documentIri, iri, '');

				if (prefix !== '') {
					prefixMap[prefix] = iri;
				}
			}

			const outputQuads = this._prepareQuads(inputQuads);
			const outputOptions = this._buildTurtleOptions(prefixMap);

			return new TurtleSerializer().serialize(outputQuads, outputOptions);
		} catch (error) {
			console.error('Error serializing quads to Turtle:', error);
			return '';
		}
	}

	/**
	 * Serializes an array of quads into Turtle format without requiring a context.
	 * @param quads The array of quads to serialize.
	 * @param namespaces Optional namespace map for prefix resolution.
	 * @returns A string containing the serialized Turtle document.
	 */
	async serializeQuadsToString(quads: Quad[], namespaces?: Record<string, string>): Promise<string> {
		try {
			if (quads.length === 0) {
				return '';
			}

			const prefixMap: Record<string, string> = {};

			if (namespaces) {
				Object.assign(prefixMap, namespaces);
			} else {
				// Collect unique namespace IRIs from the quads
				const namespaceIris = new Set<string>();

				for (const quad of quads) {
					if (quad.subject.termType === 'NamedNode') {
						namespaceIris.add(Uri.getNamespaceIri(quad.subject.value));
					}
					if (quad.predicate.termType === 'NamedNode') {
						namespaceIris.add(Uri.getNamespaceIri(quad.predicate.value));
					}
					if (quad.object.termType === 'NamedNode') {
						namespaceIris.add(Uri.getNamespaceIri(quad.object.value));
					}
				}

				// Build prefix map using inference prefixes and default prefixes
				const inferencePrefixes = this._prefixLookupService.getInferencePrefixes();
				const defaultPrefixes = this._prefixLookupService.getDefaultPrefixes();
				const allPrefixes = { ...inferencePrefixes, ...defaultPrefixes };

				for (const iri of namespaceIris) {
					// allPrefixes is { prefix: iri }, so we need to find the prefix for this iri
					for (const [prefix, prefixIri] of Object.entries(allPrefixes)) {
						if (prefixIri === iri) {
							prefixMap[prefix] = iri;
							break;
						}
					}
				}
			}

			return new TurtleSerializer().serialize(this._prepareQuads(quads), this._buildTurtleOptions(prefixMap));
		} catch (error) {
			console.error('Error serializing quads to Turtle:', error);
			return '';
		}
	}
}
import { BaseQuad, DatasetCore, Literal, Quad, Quad_Graph, Term } from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { GraphUriGenerator, LanguageTagUsageStats, Store, XSD, RDF, RDFS } from '@faubulous/mentor-rdf';
import { InferenceUri } from '@src/providers/inference-uri';

/**
 * The shared RDF/JS DataFactory of the extension, extended with a `dataset()` method
 * (DatasetCoreFactory) as required by libraries that consume an RDF/JS environment such as
 * shacl-engine.
 *
 * `literal()` must tolerate `null` as the language/datatype argument, because
 * shacl-engine calls `factory.literal(text, message.language || null)` when there
 * is no language tag. The rdf-data-factory implementation treats `null` like
 * `undefined` and returns an `xsd:string` literal.
 */
export const RdfDataFactory = Object.assign(new DataFactory(), {
	dataset(): DatasetCore {
		return RdfStore.createDefault().asDataset();
	}
});

/**
 * The shared graph URI generator of the store's reasoner. It names the inference graphs the way
 * Mentor does, `<graph>?inference`, so that an inference graph sorts after its source graph and
 * the prefixes of the source keep working, and it tells the store which graphs are inference
 * graphs when a query leaves inferred triples out.
 */
export const InferenceGraphUriGenerator: GraphUriGenerator = {
	getGraphUri(uri: string | Quad_Graph): string {
		return InferenceUri.toInferenceUri(getGraphUriValue(uri));
	},
	isInferenceGraphUri(uri: string | Quad_Graph): boolean {
		return InferenceUri.isInferenceUri(getGraphUriValue(uri));
	}
};

/**
 * Returns the URI of a graph term, or the URI itself.
 * @param uri A graph term or URI.
 */
function getGraphUriValue(uri: string | Quad_Graph): string {
	return typeof uri === 'string' ? uri : uri.value;
}

/**
 * The type of an RDF property derived from its range.
 */
export type PropertyType = 'objectProperty' | 'dataProperty' | 'annotationProperty';

/**
 * Classifies a property as a data property or an object property (relation)
 * based on its range or datatype IRI. Literal-valued ranges (XSD datatypes,
 * rdfs:Literal, rdf:langString) indicate a data property; everything else is
 * treated as an object property.
 *
 * This is the shared classification used by the definition tree icons and the
 * completion item kinds so that both surfaces categorize properties identically.
 *
 * @param rangeIri The IRI of the property's range or datatype, if known.
 * @returns The property type derived from the range.
 */
export function getPropertyTypeFromRange(rangeIri?: string): PropertyType {
	switch (rangeIri) {
		case RDF.langString:
		case RDFS.Literal:
		case XSD.base64Binary:
		case XSD.boolean:
		case XSD.byte:
		case XSD.date:
		case XSD.dateTime:
		case XSD.decimal:
		case XSD.double:
		case XSD.float:
		case XSD.int:
		case XSD.integer:
		case XSD.long:
		case XSD.negativeInteger:
		case XSD.nonNegativeInteger:
		case XSD.nonPositiveInteger:
		case XSD.positiveInteger:
		case XSD.short:
		case XSD.string:
		case XSD.unsignedInt:
		case XSD.unsignedShort:
		case XSD.unsignedLong:
		case XSD.unsignedByte: {
			return 'dataProperty';
		}
		default: {
			return 'objectProperty';
		}
	}
}

/**
 * Loads RDF content into a store graph, choosing the loader by the source file's
 * extension: `.nq` is parsed as N-Quads, everything else (`.ttl`, `.nt`) through
 * the Turtle loader, which handles both. Inference is skipped and the target
 * graph is replaced. The single source of truth for the extension → loader
 * dispatch that shape and template loading rely on.
 * @param store The RDF store to load into.
 * @param content The serialized RDF content.
 * @param graphUri The graph URI to load the triples under.
 * @param fileName The source file name or path whose extension selects the loader.
 */
export function loadRdfContent(store: Store, content: string, graphUri: string, fileName: string): void {
	if (fileName.endsWith('.nq')) {
		store.loadNQuads(content, graphUri, false, true);
	} else {
		store.loadTurtle(content, graphUri, false, true);
	}
}

/**
 * Counts the language tag of a literal object in language tag usage statistics. Literals
 * without a language tag are counted under the empty tag, other terms are ignored.
 * @param stats The statistics to update.
 * @param object The object of a triple.
 */
export function addLanguageTagUsage(stats: LanguageTagUsageStats, object: Term): void {
	if (object.termType !== 'Literal') {
		return;
	}

	const language = (object as Literal).language;

	stats[language] = (stats[language] ?? 0) + 1;
}

/**
 * Updates the triples of a graph to the given quads. Only the quads that are not in the graph
 * yet are added and only the quads that are no longer given are deleted, so a graph whose
 * triples did not change is not modified at all and keeps its version in the store.
 * @param store The store that holds the graph.
 * @param graph The graph to update. The given quads must be in this graph.
 * @param quads The quads the graph should contain.
 * @returns `true` if the graph was changed, otherwise `false`.
 */
export function replaceGraphQuads(store: Store, graph: Quad_Graph, quads: Quad[]): boolean {
	if (!store.hasGraph(graph)) {
		for (const quad of quads) {
			store.add(quad);
		}

		return quads.length > 0;
	}

	// The quads of the graph by their triple. The entry of a triple that is among the given
	// quads is set to `undefined`, so the quads left in the map are the deleted ones.
	const graphQuads = new Map<string, Quad | undefined>();

	for (const quad of store.matchQuads(null, null, null, graph)) {
		graphQuads.set(getTripleKey(quad), quad);
	}

	let changed = false;

	for (const quad of quads) {
		const key = getTripleKey(quad);

		if (graphQuads.get(key) === undefined && !graphQuads.has(key)) {
			store.add(quad);

			changed = true;
		}

		graphQuads.set(key, undefined);
	}

	for (const quad of graphQuads.values()) {
		if (quad) {
			store.delete(quad);

			changed = true;
		}
	}

	return changed;
}

/**
 * Returns a key that identifies the subject, predicate and object of a quad. The terms are
 * separated by U+0000, which cannot occur in the keys of subjects and predicates; the object,
 * whose literal value may contain it, comes last.
 * @param quad A quad.
 * @returns A key that is equal for two quads if and only if their triples are equal.
 */
function getTripleKey(quad: BaseQuad): string {
	return getTermKey(quad.subject) + '\u0000' + getTermKey(quad.predicate) + '\u0000' + getTermKey(quad.object);
}

/**
 * Returns a key that identifies a term.
 * @param term A term.
 * @returns A key that is equal for two terms if and only if the terms are equal.
 */
function getTermKey(term: Term): string {
	switch (term.termType) {
		case 'NamedNode': {
			// IRIs contain neither spaces nor `"`, so they cannot be mistaken for the keys below.
			return term.value;
		}
		case 'BlankNode': {
			return ' ' + term.value;
		}
		case 'Literal': {
			const literal = term as Literal;

			// The language tag and the datatype IRI contain neither `^` nor U+0000, so the
			// value, which may contain any character, can follow them unambiguously.
			return '"' + literal.language + '^' + literal.datatype.value + '\u0000' + literal.value;
		}
		default: {
			// Triple terms and other terms are rare; JSON escapes U+0000 in their values.
			return term.termType + JSON.stringify(term.termType === 'Quad' ? getTripleKey(term as BaseQuad) : term.value);
		}
	}
}

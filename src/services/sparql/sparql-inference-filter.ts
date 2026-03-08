import * as rdfjs from '@rdfjs/types';
import { InferenceUri } from '@src/workspace/inference-uri';

/**
 * Creates a filtered source that wraps an RDF/JS store and filters out quads
 * from inference graphs. The filter checks if the graph IRI ends with the
 * inference URI appendix and excludes those quads from the match results.
 * 
 * @param store The RDF/JS source to wrap.
 * @returns A filtered source that excludes inference graph quads.
 * 
 * @example
 * ```typescript
 * const filteredSource = createFilteredSource(store);
 * const source = { type: 'rdfjs', value: filteredSource };
 * // Queries using this source will not include inferred triples
 * ```
 */
export function createFilteredSource(store: rdfjs.Source<rdfjs.Quad>): {
	match(subject: rdfjs.Quad_Subject | null, predicate: rdfjs.Quad_Predicate | null, object: rdfjs.Quad_Object | null, graph: rdfjs.Quad_Graph | null): rdfjs.Stream<rdfjs.Quad>;
} {
	return {
		match(
			subject: rdfjs.Quad_Subject | null,
			predicate: rdfjs.Quad_Predicate | null,
			object: rdfjs.Quad_Object | null,
			graph: rdfjs.Quad_Graph | null
		): rdfjs.Stream<rdfjs.Quad> {
			// Call the original match and filter out inference graph quads
			return (store.match(subject, predicate, object, graph) as any).filter(
				(quad: rdfjs.Quad) => !InferenceUri.isInferenceUri(quad.graph.value)
			);
		}
	};
}

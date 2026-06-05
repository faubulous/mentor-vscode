import { Store } from '@faubulous/mentor-rdf';
import { ComunicaEndpoint } from '../sparql-endpoint';
import { createFilteredSource } from '../sparql-inference-filter';
import { InferenceUri } from '@src/providers/inference-uri';

/**
 * A function that returns the workspace RDF store.
 * @note This allows lazy initialization of the store.
 */
export type StoreGetter = () => Store;

/**
 * The local workspace RDF store — the only code-backed store type.
 *
 * Unlike the user-defined HTTP store profiles, this operates on the in-memory RDF/JS store used by
 * the Mentor extension.
 */
export class WorkspaceEndpointProvider {
	constructor(private readonly _getStore: StoreGetter) { }

	/**
	 * Creates a Comunica-compatible RDF/JS source over the in-memory workspace store.
	 * @param inferenceEnabled When `false`, inference-graph quads are filtered out.
	 */
	createEndpoint(inferenceEnabled: boolean): ComunicaEndpoint {
		const store = this._getStore();

		if (!inferenceEnabled) {
			// Filter out inference graph quads.
			return {
				type: 'rdfjs',
				value: createFilteredSource(store),
			};
		}

		// Include all quads including inferred ones.
		return {
			type: 'rdfjs',
			value: store,
		};
	}

	/**
	 * Enumerates the named graphs in the workspace store.
	 * @param inferenceEnabled When `false`, inference graphs are excluded.
	 */
	getGraphs(inferenceEnabled: boolean): string[] {
		const graphs = this._getStore().getGraphs();

		return inferenceEnabled ? graphs : graphs.filter(g => !InferenceUri.isInferenceUri(g));
	}
}

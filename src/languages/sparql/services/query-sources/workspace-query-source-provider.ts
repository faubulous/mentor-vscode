import { Store } from '@faubulous/mentor-rdf';
import { SparqlConnection, SparqlStoreType } from '../sparql-connection';
import { ComunicaEndpoint } from '../sparql-endpoint';
import { createFilteredSource } from '../sparql-inference-filter';
import { ISparqlEndpointProvider, SparqlEndpointOptions } from '../sparql-endpoint-provider.interface';
import { InferenceUri } from '@src/providers/inference-uri';

/**
 * A function that returns the workspace RDF store.
 * This allows lazy initialization of the store.
 */
export type StoreGetter = () => Store;

/**
 * Query source provider for the local workspace RDF store.
 * 
 * This provider creates query sources that operate on the in-memory
 * RDF/JS store used by the Mentor extension. Inference is supported
 * by filtering out quads from inference graphs when disabled.
 */
export class WorkspaceQuerySourceProvider implements ISparqlEndpointProvider {
	readonly storeType: SparqlStoreType = 'workspace';

	readonly supportsInference = true;

	constructor(private readonly _getStore: StoreGetter) { }

	async createEndpoint(
		_connection: SparqlConnection,
		options: SparqlEndpointOptions
	): Promise<ComunicaEndpoint> {
		const store = this._getStore();

		if (!options.inferenceEnabled) {
			// Filter out inference graph quads
			return {
				type: 'rdfjs',
				value: createFilteredSource(store),
			};
		} else {
			// Include all quads including inferred ones
			return {
				type: 'rdfjs',
				value: store,
			};
		}
	}

	async getGraphs(
		_connection: SparqlConnection,
		options: SparqlEndpointOptions
	): Promise<string[]> {
		const store = this._getStore();
		let graphs = store.getGraphs();

		// Filter out inference graphs if inference is disabled.
		if (!options.inferenceEnabled) {
			graphs = graphs.filter(g => !InferenceUri.isInferenceUri(g));
		}

		return graphs;
	}
}

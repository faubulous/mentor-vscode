import { Store } from '@faubulous/mentor-rdf';
import { SparqlConnection, SparqlStoreType } from '../sparql-connection';
import { ComunicaSource } from '../sparql-query-source';
import { createFilteredSource } from '../sparql-inference-filter';
import { ISparqlQuerySourceProvider, QuerySourceOptions } from '../sparql-query-source-provider.interface';

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
export class WorkspaceQuerySourceProvider implements ISparqlQuerySourceProvider {
	readonly storeType: SparqlStoreType = 'workspace';

	readonly supportsInference = true;

	constructor(private readonly _getStore: StoreGetter) { }

	async createQuerySource(
		_connection: SparqlConnection,
		options: QuerySourceOptions
	): Promise<ComunicaSource> {
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
}

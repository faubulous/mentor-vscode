import * as rdfjs from '@rdfjs/types';
import { SparqlConnection } from './sparql-connection';

/**
 * A Comunica-compatible source configuration for a SPARQL endpoint.
 */
export interface SparqlConnectionSource {
	type: 'sparql';
	value: string;
	connection: SparqlConnection;
	headers?: Record<string, string>;
}

/**
 * A Comunica-compatible source configuration for an in-memory RDF/JS store.
 */
export interface QuadStoreSource {
	type: 'rdfjs';
	value: rdfjs.Source<rdfjs.Quad>;
}

/**
 * A filtered Comunica-compatible source that wraps an RDF/JS store and applies
 * a filter function to the `match()` method. This is used to filter out inference
 * graphs from query results when inference is disabled.
 */
export interface FilteredQuadStoreSource {
	type: 'rdfjs';
	value: {
		match(subject: rdfjs.Quad_Subject | null, predicate: rdfjs.Quad_Predicate | null, object: rdfjs.Quad_Object | null, graph: rdfjs.Quad_Graph | null): rdfjs.Stream<rdfjs.Quad>;
	};
}

export type ComunicaSource = SparqlConnectionSource | QuadStoreSource | FilteredQuadStoreSource;
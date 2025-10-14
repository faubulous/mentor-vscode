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

export type ComunicaSource = SparqlConnectionSource | QuadStoreSource;
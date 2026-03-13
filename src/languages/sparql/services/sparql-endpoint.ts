import * as rdfjs from '@rdfjs/types';
import { SparqlConnection } from './sparql-connection';

export type ComunicaEndpoint = SparqlEndpoint | QuadStoreEndpoint;

/**
 * A Comunica-compatible source configuration for a SPARQL endpoint.
 */
export interface SparqlEndpoint {
	type: 'sparql';
	value: string;
	connection: SparqlConnection;
	headers?: Record<string, string>;
}

/**
 * A Comunica-compatible source configuration for an in-memory RDF/JS store.
 */
export interface QuadStoreEndpoint {
	type: 'rdfjs';
	value: rdfjs.Source<rdfjs.Quad>;
}
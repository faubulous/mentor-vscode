import * as rdfjs from '@rdfjs/types';
import { SparqlEndpoint } from './sparql-endpoint';

/**
 * A Comunica-compatible source configuration for a SPARQL endpoint.
 */
export interface SparqlEndpointSource {
	type: 'sparql';
	value: string;
	connection: SparqlEndpoint;
	headers?: Record<string, string>;
}

/**
 * A Comunica-compatible source configuration for an in-memory RDF/JS store.
 */
export interface QuadStoreSource {
	type: 'rdfjs';
	value: rdfjs.Source<rdfjs.Quad>;
}

export type ComunicaSource = SparqlEndpointSource | QuadStoreSource;
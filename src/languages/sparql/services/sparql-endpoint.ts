import * as rdfjs from '@rdfjs/types';
import { SparqlConnection } from './sparql-connection';

export type ComunicaEndpoint = SparqlEndpoint | QuadStoreEndpoint;

/**
 * A Comunica-compatible source configuration for a SPARQL endpoint.
 */
interface SparqlEndpoint {
	/**
	 * Indicates that this endpoint is managed using the SPARQL protocol.
	 */
	type: 'sparql';

	/**
	 * The URL of the SPARQL endpoint.
	 */
	value: string;

	/**
	 * The SPARQL connection used for communicating with the endpoint.
	 */
	connection: SparqlConnection;

	/**
	 * The connection headers used for authentication and MIME type management.
	 */
	headers?: Record<string, string>;

	/**
	 * The resolved inference setting used to create this source. Carried on the source so the
	 * query executor can apply store-specific query-text rewriting at execution time.
	 */
	inferenceEnabled?: boolean;
}

/**
 * A Comunica-compatible source configuration for an in-memory RDF/JS store.
 */
interface QuadStoreEndpoint {
	/**
	 * Indicates that this endpoint is managed using the RDFJS Quad Source API.
	 */
	type: 'rdfjs';

	/**
	 * The RDF/JS Quad Source API.
	 */
	value: rdfjs.Source<rdfjs.Quad>;
}
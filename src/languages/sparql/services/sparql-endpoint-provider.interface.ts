import { SparqlConnection, SparqlStoreType } from './sparql-connection';
import { ComunicaEndpoint } from './sparql-endpoint';

/**
 * Options for creating a query source.
 */
export interface SparqlEndpointOptions {
    /**
     * Whether inference should be enabled for the query source.
     */
    inferenceEnabled: boolean;
}

/**
 * Interface for providers that create Comunica-compatible query sources
 * for different types of SPARQL stores.
 * 
 * Each provider handles a specific store type and knows how to configure
 * inference and other store-specific features.
 */
export interface ISparqlEndpointProvider {
    /**
     * The store type this provider handles.
     */
    readonly storeType: SparqlStoreType;

    /**
     * Whether this provider supports inference toggling.
     */
    readonly supportsInference: boolean;

    /**
     * Creates a Comunica-compatible query source for the given connection.
     * @param connection The SPARQL connection.
     * @param options Options including inference settings.
     * @returns A promise that resolves to a ComunicaSource configuration.
     */
    createEndpoint(
        connection: SparqlConnection,
        options: SparqlEndpointOptions
    ): Promise<ComunicaEndpoint>;

    /**
     * Retrieves the list of named graphs available from the query source.
     * @param connection The SPARQL connection.
     * @param options Options including inference settings.
     * @returns A promise that resolves to an array of graph IRIs.
     */
    getGraphs(
        connection: SparqlConnection,
        options: SparqlEndpointOptions
    ): Promise<string[]>;
}

import { SparqlConnection, SparqlStoreType } from '../sparql-connection';
import { ComunicaEndpoint, SparqlEndpoint } from '../sparql-endpoint';
import { ISparqlEndpointProvider, SparqlEndpointOptions } from '../sparql-endpoint-provider.interface';

/**
 * Default query source provider for generic SPARQL endpoints.
 * 
 * This provider creates query sources for standard SPARQL endpoints
 * that do not support inference toggling through URL parameters or headers.
 * It serves as a fallback when no specific provider is registered for
 * a store type.
 */
export class DefaultSparqlQuerySourceProvider implements ISparqlEndpointProvider {
    readonly storeType: SparqlStoreType = 'sparql';

    readonly supportsInference = false;

    async createEndpoint(
        connection: SparqlConnection,
        _options: SparqlEndpointOptions
    ): Promise<ComunicaEndpoint> {
        const source: SparqlEndpoint = {
            type: 'sparql',
            value: connection.endpointUrl,
            connection: connection,
        };

        return source;
    }

    async getGraphs(
        _connection: SparqlConnection,
        _options: SparqlEndpointOptions
    ): Promise<string[]> {
        // TODO: Implement generic SPARQL graph retrieval via SPARQL query
        // e.g., SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } }
        return [];
    }
}

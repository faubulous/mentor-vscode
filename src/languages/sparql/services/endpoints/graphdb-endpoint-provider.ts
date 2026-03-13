import { SparqlConnection, SparqlStoreType } from '../sparql-connection';
import { ComunicaEndpoint, SparqlEndpoint } from '../sparql-endpoint';
import { ISparqlEndpointProvider, SparqlEndpointOptions } from '../sparql-endpoint-provider.interface';

/**
 * Query source provider for Ontotext GraphDB SPARQL endpoints.
 * 
 * GraphDB supports inference toggling via the `infer` URL parameter.
 * When `infer=true`, GraphDB includes inferred statements in results.
 * When `infer=false`, only explicit statements are returned.
 * 
 * @see https://graphdb.ontotext.com/documentation/10.0/sparql-api.html
 */
export class GraphDbEndpointProvider implements ISparqlEndpointProvider {
    readonly storeType: SparqlStoreType = 'graphdb';

    readonly supportsInference = true;

    async createEndpoint(
        connection: SparqlConnection,
        options: SparqlEndpointOptions
    ): Promise<ComunicaEndpoint> {
        const url = new URL(connection.endpointUrl);
        url.searchParams.set('infer', options.inferenceEnabled ? 'true' : 'false');

        const source: SparqlEndpoint = {
            type: 'sparql',
            value: url.toString(),
            connection: connection,
        };

        return source;
    }

    async getGraphs(
        _connection: SparqlConnection,
        _options: SparqlEndpointOptions
    ): Promise<string[]> {
        // TODO: Implement GraphDB-specific graph retrieval via SPARQL query
        // e.g., SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } }
        return [];
    }
}

import { SparqlConnection, SparqlStoreType } from '../sparql-connection';
import { ComunicaSource, SparqlConnectionSource } from '../sparql-query-source';
import { ISparqlQuerySourceProvider, QuerySourceOptions } from '../sparql-query-source-provider.interface';

/**
 * Default query source provider for generic SPARQL endpoints.
 * 
 * This provider creates query sources for standard SPARQL endpoints
 * that do not support inference toggling through URL parameters or headers.
 * It serves as a fallback when no specific provider is registered for
 * a store type.
 */
export class DefaultSparqlQuerySourceProvider implements ISparqlQuerySourceProvider {
    readonly storeType: SparqlStoreType = 'sparql';

    readonly supportsInference = false;

    async createQuerySource(
        connection: SparqlConnection,
        _options: QuerySourceOptions
    ): Promise<ComunicaSource> {
        const source: SparqlConnectionSource = {
            type: 'sparql',
            value: connection.endpointUrl,
            connection: connection,
        };

        return source;
    }

    async getGraphs(
        _connection: SparqlConnection,
        _options: QuerySourceOptions
    ): Promise<string[]> {
        // TODO: Implement generic SPARQL graph retrieval via SPARQL query
        // e.g., SELECT DISTINCT ?g WHERE { GRAPH ?g { ?s ?p ?o } }
        return [];
    }
}

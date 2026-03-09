import { SparqlConnection, SparqlStoreType } from '../../services/sparql/sparql-connection';
import { ComunicaSource, SparqlConnectionSource } from '../../services/sparql/sparql-query-source';
import { ISparqlQuerySourceProvider, QuerySourceOptions } from '../../services/sparql/sparql-query-source-provider.interface';

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
}

import { SparqlConnection, SparqlStoreType } from '../sparql-connection';
import { ComunicaSource, SparqlConnectionSource } from '../sparql-query-source';
import { ISparqlQuerySourceProvider, QuerySourceOptions } from '../sparql-query-source-provider.interface';

/**
 * Query source provider for Ontotext GraphDB SPARQL endpoints.
 * 
 * GraphDB supports inference toggling via the `infer` URL parameter.
 * When `infer=true`, GraphDB includes inferred statements in results.
 * When `infer=false`, only explicit statements are returned.
 * 
 * @see https://graphdb.ontotext.com/documentation/10.0/sparql-api.html
 */
export class GraphDbQuerySourceProvider implements ISparqlQuerySourceProvider {
    readonly storeType: SparqlStoreType = 'graphdb';

    readonly supportsInference = true;

    async createQuerySource(
        connection: SparqlConnection,
        options: QuerySourceOptions
    ): Promise<ComunicaSource> {
        const url = new URL(connection.endpointUrl);
        url.searchParams.set('infer', options.inferenceEnabled ? 'true' : 'false');

        const source: SparqlConnectionSource = {
            type: 'sparql',
            value: url.toString(),
            connection: connection,
        };

        return source;
    }
}

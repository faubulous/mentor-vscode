import { ConfigurationScope } from '@src/utilities/config-scope';

/**
 * Connection information for a SPARQL endpoint.
 */
export interface SparqlConnection {
    /**
     * The identifier of the connection, usually a UUID.
     */
    id: string;

    /**
     * The SPARQL endpoint URL (e.g., 'https://dbpedia.org/sparql' or 'workspace:')
     */
    endpointUrl: string;

    /**
     * The location where the connection is stored, either the workspace folder or the global settings.
     */
    configScope: ConfigurationScope;

    /**
     * Indicates if this connection is newly created and not yet saved.
     */
    isNew?: boolean;

    /**
     * Indicates if this connection has unsaved changes.
     */
    isModified?: boolean;

    /**
     * Indicates if this connection can be removed or modified by the user.
     */
    isProtected?: boolean;

    /**
     * Indicates if this connection supports inference toggling.
     * When `true`, the connection can filter out inferred triples from query results.
     * @remarks Currently only supported for the workspace store. Future implementations
     * may support this for SPARQL endpoints that have inference capabilities.
     */
    inferenceSupported?: boolean;

    /**
     * Indicates if inference is currently enabled for this connection.
     * When `false`, queries will only return asserted triples from the store.
     * When `true`, inferred triples are included in query results.
     * This setting is only applicable when `inferenceSupported` is `true`.
     */
    inferenceEnabled?: boolean;
}
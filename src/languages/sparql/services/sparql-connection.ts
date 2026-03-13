import { ConfigurationScope } from '@src/utilities/config-scope';

/**
 * The type of SPARQL store. Determines how inference and other
 * store-specific features are handled.
 */
export type SparqlStoreType = 'workspace' | 'sparql' | 'graphdb';

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
     * The type of SPARQL store. Determines how inference and other
     * store-specific features are handled.
     * @default 'sparql'
     */
    storeType?: SparqlStoreType;

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
     * Indicates if inference is currently enabled for this connection.
     * When `false`, queries will only return asserted triples from the store.
     * When `true`, inferred triples are included in query results.
     * This setting is only applicable for store types that support inference.
     */
    inferenceEnabled?: boolean;

    /**
     * Whether this connection supports inference toggling.
     * Set by the connection service based on provider capability.
     */
    inferenceSupported?: boolean;
}
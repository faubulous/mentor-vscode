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
     * Optional human-readable display name for the connection.
     */
    label?: string;

    /**
     * An optional description providing context for the connection.
     */
    description?: string;

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
    storeType?: string;

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
     * Whether inference can be toggled for this connection.
     * Set by the connection service based on provider capability.
     */
    canToggleInference?: boolean;

    /**
     * When `true`, named graphs are loaded from the endpoint on extension startup
     * and refreshed on the interval defined by `graphReloadIntervalSeconds`.
     */
    autoLoadGraphs?: boolean;

    /**
     * How often to reload the graph list, in seconds. Only meaningful when
     * `autoLoadGraphs` is `true`. The UI presents this in minutes or hours
     * and converts to seconds before saving.
     */
    graphReloadIntervalSeconds?: number;
}
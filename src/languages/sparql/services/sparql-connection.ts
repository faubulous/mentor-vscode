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

/**
 * A connection projected for the settings webview. Inference state is not part of the
 * domain `SparqlConnection` (it lives in workspace state and is resolved via the connection
 * service); this view attaches the resolved per-connection default so the editor can render
 * and toggle it. Only used at the host↔webview boundary.
 */
export type SparqlConnectionView = SparqlConnection & {
    /**
     * The connection's persisted default inference setting, resolved at send time.
     */
    inferenceEnabled?: boolean;

    /**
     * Set to the connection's `storeType` when that id does not resolve to any
     * store config on this machine (e.g. a user-scope store referenced by a
     * shared workspace connection). The connection then behaves like a generic
     * SPARQL endpoint; the settings list surfaces this with a warning badge.
     */
    unresolvedStoreType?: string;

    /**
     * Set to the scope the connection's store type is actually defined in when
     * that differs from the connection's own scope (user connection → workspace
     * store, or workspace connection → user store). Such a reference breaks as
     * soon as the settings roam; the settings list surfaces it with a warning
     * badge. Mutually exclusive with `unresolvedStoreType`.
     */
    incompatibleStoreScope?: 'user' | 'workspace';
};
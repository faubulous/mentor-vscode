import { ConfigurationScope } from '@src/utilities/config-scope';

/**
 * A user-definable SPARQL store type. Store configs are stored in the `mentor.sparql.stores`
 * setting and let users create, rename, and remove store types, and define the same store with
 * different settings more than once.
 */
export interface SparqlStoreConfig {
    /**
     * Stable identifier referenced by `SparqlConnection.storeType`.
     */
    id: string;

    /**
     * Transient, UI-only marker for which configuration scope this store is persisted in
     * (User vs Workspace). Never serialized into the `sparql.stores` setting — it is
     * stripped before writing and re-derived on read.
     */
    configScope?: ConfigurationScope;

    /**
     * Human-readable name shown in pickers (renamable).
     */
    label: string;

    /**
     * Optional free-text description of the store type. Set on built-in stores (e.g. the
     * workspace store) for informational display; user-defined stores use {@link website} instead.
     */
    description?: string;

    /**
     * Optional website/documentation URL for the store type. When set, the store list shows it as
     * the subline and offers an "open in browser" action.
     */
    website?: string;

    /**
     * Reasoning control configuration; absent means the store does not support reasoning.
     */
    inference?: SparqlStoreInferenceConfig;

    /**
     * When `true`, the store cannot be edited or deleted from the settings UI.
     * The built-in workspace store sets this; users may also set it on their own stores.
     */
    isProtected?: boolean;

    /**
     * Store-specific default query templates; a blank field falls back to the global setting.
     */
    queries?: SparqlStoreQueryTemplates;
}

/**
 * Interface for the reasoning configuration of a triple store instances.
 */
export interface SparqlStoreInferenceConfig {
    /**
     * Whether the store supports toggling reasoning at all.
     */
    supported: boolean;

    /**
     * Query-string fragment appended to the endpoint URL (e.g. `infer=true&reasoning=rdfs`).
     */
    urlParameters?: SparqlStoreInferenceConfigParameters;

    /**
     * Text prepended to the query (e.g. `#pragma reasoning on`).
     */
    queryPragma?: SparqlStoreInferenceConfigParameters;
}

/**
 * Provides generic string parameter values for enablding or disabling inference on SPARQL queries.
 */
export interface SparqlStoreInferenceConfigParameters {
    /**
     * Parameter value to be used when inference is on.
     */
    enabled?: string;

    /**
     * Parameter value to be used when inference is off.
     */
    disabled?: string;
}

/**
 * Registry of all supported SPARQL query template kinds. Each entry provides the display
 * label and description for the settings UI and the global VS Code setting key used as the
 * fallback when no per-store override is defined.
 *
 * Adding a new kind here automatically widens {@link SparqlQueryKind} and
 * {@link SparqlStoreQueryTemplates} — no other type definitions need updating.
 */
export const SPARQL_QUERY_KINDS = {
    listGraphs: {
        label: 'List Graphs Query',
        description: 'Retrieves the named graphs available from the store. Leave blank to use the global default.',
        globalSettingKey: 'sparql.listGraphsQuery',
    },
    dropGraph: {
        label: 'Drop Graph Query',
        description: 'Deletes a named graph from the store. Leave blank to use the global default.',
        globalSettingKey: 'sparql.dropGraphQuery',
    },
    describe: {
        label: 'Describe Query',
        description: 'Describes a resource, used by the Describe command. Leave blank to use the global default.',
        globalSettingKey: 'sparql.describeQueryTemplate',
    },
} as const;

/** Derived from {@link SPARQL_QUERY_KINDS} — adding an entry there automatically widens this type. */
export type SparqlQueryKind = keyof typeof SPARQL_QUERY_KINDS;

/** Derived from {@link SparqlQueryKind} — always in sync with the registry. */
export type SparqlStoreQueryTemplates = Partial<Record<SparqlQueryKind, string>>;
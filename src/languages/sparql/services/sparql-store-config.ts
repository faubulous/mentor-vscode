/**
 * A user-definable SPARQL store type. Store configs are stored in the `mentor.sparql.storeTypes`
 * setting and let users create, rename, and remove store types, and define the same store with
 * different settings more than once. The built-in workspace store is the only exception — it is a
 * code-only in-memory store and is not represented as a store config.
 */
export interface SparqlStoreConfig {
    /**
     * Stable identifier referenced by `SparqlConnection.storeType`.
     */
    id: string;

    /**
     * Human-readable name shown in pickers (renamable).
     */
    label: string;

    /**
     * Reasoning control configuration; absent means the store does not support reasoning.
     */
    inference?: SparqlStoreInferenceConfig;

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
 * The kinds of store-specific SPARQL query templates that can be resolved for a connection.
 * - `listGraphs`: retrieves the named graphs available from the store.
 * - `dropGraph`: drops a named graph from the store.
 * - `describe`: describes a resource (used by the describe command).
 */
export type SparqlQueryKind = 'listGraphs' | 'dropGraph' | 'describe';

/**
 * Store-specific default SPARQL query templates.
 *
 * Each store type may provide its own defaults to account for differences in supported
 * SPARQL features (e.g. some stores accept an empty `GRAPH ?g {}` pattern while others
 * require `GRAPH ?g { ?s ?p ?o }`). Any template left undefined falls back to the global
 * `mentor.sparql.*` setting.
 */
export interface SparqlStoreQueryTemplates {
    listGraphs?: string;
    dropGraph?: string;
    describe?: string;
}
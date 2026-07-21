import { ConfigurationScope } from '@src/utilities/config-scope';
import { generateUniqueSlug } from '@src/utilities/string';

/**
 * A user-definable SPARQL store type. Store configs are stored in the `mentor.sparql.stores`
 * setting and let users create, rename, and remove store types, and define the same store with
 * different settings more than once.
 */
export interface TripleStoreConfig {
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
     * Optional free-text description of the store type, shown as the subline in the store list.
     */
    description?: string;

    /**
     * Optional documentation URL for the store type. When set, the store list offers an
     * "open documentation" action.
     */
    documentationUrl?: string;

    /**
     * Reasoning control configuration; absent means the store does not support reasoning.
     */
    inference?: TripleStoreInferenceConfig;

    /**
     * When `true`, the store cannot be edited or deleted from the settings UI.
     * The built-in workspace store sets this; users may also set it on their own stores.
     */
    isProtected?: boolean;

    /**
     * Store-specific default query templates; a blank field falls back to the global setting.
     */
    queries?: TripleStoreQueryTemplates;
}

/**
 * Generates a stable store id from a display label: slugified, disambiguated
 * with a numeric suffix on collision (`my-store`, `my-store-2`, …), mirroring
 * how validation-profile ids are minted. The id is minted once when a store is
 * first saved and never changes on rename. Callers must include the preset and
 * reserved internal ids (e.g. `sparql`, `workspace`) in `existingIds`, since
 * settings entries colliding with those are silently hidden at read time.
 * @param label The store's display label.
 * @param existingIds Every id the new one must not collide with.
 */
export function generateStoreId(label: string, existingIds: readonly string[]): string {
    return generateUniqueSlug(label, existingIds, 'store');
}

/**
 * Interface for the reasoning configuration of a triple store instances.
 */
export interface TripleStoreInferenceConfig {
    /**
     * Whether the store supports toggling reasoning at all.
     */
    supported: boolean;

    /**
     * Query-string fragment appended to the endpoint URL (e.g. `infer=true&reasoning=rdfs`).
     */
    urlParameters?: TripleStoreInferenceConfigParameters;

    /**
     * Text prepended to the query (e.g. `#pragma reasoning on`).
     */
    queryPragma?: TripleStoreInferenceConfigParameters;
}

/**
 * Provides generic string parameter values for enablding or disabling inference on SPARQL queries.
 */
export interface TripleStoreInferenceConfigParameters {
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
 * The package.json property that marks a `mentor.*` setting as a store-overridable SPARQL query
 * template. Its value is the stable {@link SparqlQueryKind} slug used as the key in
 * {@link TripleStoreQueryTemplates} and looked up by the connection service. package.json is the
 * single source of truth for which queries are editable per-store and for their title/description/
 * default; this module only keeps the slug names below for compile-time safety.
 */
export const TRIPLE_STORE_QUERY_KIND_PROPERTY = 'storeQueryKind';

/**
 * The known SPARQL query template kinds. These slugs must match the `storeQueryKind` values in
 * package.json; the union exists purely so the internal call sites that request a specific query
 * (e.g. `getQueryTemplate(connection, 'describe')`) stay type-checked.
 */
export type SparqlQueryKind = 'listGraphs' | 'dropGraph' | 'describe' | 'exportGraph' | 'countGraph';

/**
 * Per-store query template overrides, keyed by {@link SparqlQueryKind}.
 */
export type TripleStoreQueryTemplates = Partial<Record<SparqlQueryKind, string>>;
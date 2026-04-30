export interface ShaclGraphShapeConfiguration {
	includeDefaults?: boolean;
	includeShapes?: string[];
	excludeShapes?: string[];
}

export interface ShaclValidationConfiguration {
	defaults?: string[];
	graphs?: Record<string, ShaclGraphShapeConfiguration>;
}

export interface NormalizedShaclGraphShapeConfiguration {
	includeDefaults: boolean;
	includeShapes: string[];
	excludeShapes: string[];
}

export interface ShaclGraphSelectionState extends NormalizedShaclGraphShapeConfiguration {
	defaults: string[];
	effectiveShapes: string[];
	source: 'graph' | 'implicit';
}

/**
 * Returns a stable unique array of non-empty string values.
 */
export function toUniqueStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const seen = new Set<string>();
	const result: string[] = [];

	for (const entry of value) {
		if (typeof entry !== 'string') {
			continue;
		}

		const trimmed = entry.trim();

		if (!trimmed || seen.has(trimmed)) {
			continue;
		}

		seen.add(trimmed);
		result.push(trimmed);
	}

	return result;
}

/**
 * Normalizes graph-level include/exclude settings to deterministic arrays.
 */
export function normalizeGraphShapeConfiguration(value: unknown): NormalizedShaclGraphShapeConfiguration {
	const config = typeof value === 'object' && value !== null
		? value as Record<string, unknown>
		: {};

	return {
		includeDefaults: config.includeDefaults !== false,
		includeShapes: toUniqueStringArray(config.includeShapes),
		excludeShapes: toUniqueStringArray(config.excludeShapes),
	};
}

/**
 * Reads default shape graph URIs from the explicit config model.
 */
export function getValidationDefaults(
	validationConfig: ShaclValidationConfiguration | undefined
): string[] {
	return toUniqueStringArray(validationConfig?.defaults);
}

/**
 * Returns a normalized graph config entry from the explicit `graphs` map.
 */
export function getGraphShapeConfiguration(
	validationConfig: ShaclValidationConfiguration | undefined,
	graphKey: string
): NormalizedShaclGraphShapeConfiguration | undefined {
	const graphs = validationConfig?.graphs;

	if (!graphs || typeof graphs !== 'object' || graphKey.length === 0) {
		return undefined;
	}

	if (!(graphKey in graphs)) {
		return undefined;
	}

	return normalizeGraphShapeConfiguration(graphs[graphKey]);
}

/**
 * Resolves effective shapes using include/exclude precedence.
 */
export function resolveEffectiveShapesFromGraphConfiguration(
	defaults: readonly string[],
	graphConfig: NormalizedShaclGraphShapeConfiguration
): string[] {
	const exclude = new Set(graphConfig.excludeShapes);
	const seen = new Set<string>();
	const result: string[] = [];

	const add = (shape: string) => {
		if (exclude.has(shape) || seen.has(shape)) {
			return;
		}

		seen.add(shape);
		result.push(shape);
	};

	if (graphConfig.includeDefaults) {
		for (const shape of defaults) {
			add(shape);
		}
	}

	for (const shape of graphConfig.includeShapes) {
		add(shape);
	}

	return result;
}

/**
 * Resolves effective shape URIs for a graph.
 */
export function resolveEffectiveShapeGraphs(
	validationConfig: ShaclValidationConfiguration | undefined,
	graphKey: string
): string[] {
	const defaults = getValidationDefaults(validationConfig);
	const graphConfig = getGraphShapeConfiguration(validationConfig, graphKey);

	if (graphConfig) {
		return resolveEffectiveShapesFromGraphConfiguration(defaults, graphConfig);
	}

	return defaults;
}

/**
 * Builds graph-level include/exclude configuration from a selected shape set.
 */
export function buildGraphShapeConfigurationFromSelection(
	selectedShapes: readonly string[],
	defaults: readonly string[],
	includeDefaults: boolean
): NormalizedShaclGraphShapeConfiguration {
	const selected = toUniqueStringArray(selectedShapes);
	const defaultSet = new Set(defaults);
	const selectedSet = new Set(selected);

	if (!includeDefaults) {
		return {
			includeDefaults: false,
			includeShapes: selected,
			excludeShapes: [],
		};
	}

	const includeShapes = selected.filter(shape => !defaultSet.has(shape));
	const excludeShapes = [...defaultSet].filter(shape => !selectedSet.has(shape));

	return {
		includeDefaults: true,
		includeShapes,
		excludeShapes,
	};
}

/**
 * Returns true when a graph config is equivalent to implicit defaults behavior.
 */
export function isImplicitGraphShapeConfiguration(config: NormalizedShaclGraphShapeConfiguration): boolean {
	return config.includeDefaults && config.includeShapes.length === 0 && config.excludeShapes.length === 0;
}

/**
 * Returns a fully-resolved graph selection state for UI initialization.
 */
export function getGraphSelectionState(
	validationConfig: ShaclValidationConfiguration | undefined,
	graphKey: string
): ShaclGraphSelectionState {
	const defaults = getValidationDefaults(validationConfig);
	const graphConfig = getGraphShapeConfiguration(validationConfig, graphKey);

	if (graphConfig) {
		return {
			...graphConfig,
			defaults,
			effectiveShapes: resolveEffectiveShapesFromGraphConfiguration(defaults, graphConfig),
			source: 'graph',
		};
	}

	return {
		includeDefaults: true,
		includeShapes: [],
		excludeShapes: [],
		defaults,
		effectiveShapes: defaults,
		source: 'implicit',
	};
}

/**
 * Migrates a SHACL validation configuration when files or folders are renamed.
 *
 * Both `graphs` keys and `defaults` entries use workspace-relative `workspace:///...`
 * URI strings as identifiers. For folder renames the match is done by URI prefix with
 * a trailing `/` guard so that renaming `workspace:///models` does not accidentally
 * affect `workspace:///models-extra/thing.ttl`.
 *
 * This function is pure: it returns a new configuration object and does not write
 * to VS Code settings. The caller is responsible for persisting the result.
 *
 * @param config The current SHACL validation configuration.
 * @param renames An array of `{ oldKey, newKey }` pairs using workspace-relative URI strings.
 * @returns A new configuration with all affected keys/entries migrated.
 */
export function migrateShaclValidationConfig(
	config: ShaclValidationConfiguration | undefined,
	renames: ReadonlyArray<{ oldKey: string; newKey: string }>
): ShaclValidationConfiguration {
	if (!config) {
		return {};
	}

	const migrateUri = (uri: string): string => {
		for (const { oldKey, newKey } of renames) {
			if (uri === oldKey || uri.startsWith(oldKey + '/')) {
				return newKey + uri.slice(oldKey.length);
			}
		}

		return uri;
	};

	const migratedDefaults = config.defaults?.map(migrateUri);

	let migratedGraphs: Record<string, ShaclGraphShapeConfiguration> | undefined;

	if (config.graphs) {
		migratedGraphs = {};

		for (const [key, value] of Object.entries(config.graphs)) {
			migratedGraphs[migrateUri(key)] = value;
		}
	}

	return {
		...config,
		...(migratedDefaults !== undefined ? { defaults: migratedDefaults } : {}),
		...(migratedGraphs !== undefined ? { graphs: migratedGraphs } : {}),
	};
}

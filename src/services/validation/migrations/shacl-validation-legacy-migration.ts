import { toUniqueStringArray } from '@src/utilities/array';
import {
	ShaclValidationProfile,
	ShaclValidationSettings,
	generateProfileId,
} from '../shacl-validation-configuration';

/**
 * The display name given to the profile created from the legacy `defaults` list.
 */
export const LEGACY_DEFAULT_PROFILE_NAME = 'Default';

/**
 * The stable id of the profile created from the legacy `defaults` list.
 */
export const LEGACY_DEFAULT_PROFILE_ID = generateProfileId(LEGACY_DEFAULT_PROFILE_NAME, []);

/**
 * The catch-all `includeFiles` entry that replaces the legacy "defaults apply
 * everywhere" behavior: it matches every recognized RDF file in the workspace.
 */
export const LEGACY_DEFAULT_PATHS_KEY = '**/*';

/**
 * Legacy per-graph include/exclude configuration (pre-profiles model).
 */
export interface LegacyShaclGraphShapeConfiguration {
	includeDefaults?: boolean;
	includeShapes?: string[];
	excludeShapes?: string[];
}

/**
 * Legacy `mentor.shacl.validation` value (pre-profiles model): a flat list of
 * default shape files plus per-graph include/exclude overrides.
 */
export interface LegacyShaclValidationConfiguration {
	defaults?: string[];
	graphs?: Record<string, LegacyShaclGraphShapeConfiguration>;
}

/**
 * Returns true when a settings value uses the legacy `{ defaults, graphs }`
 * shape rather than the profile-based `{ profiles }` shape.
 */
export function isLegacyShaclValidationConfig(value: unknown): value is LegacyShaclValidationConfiguration {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as Record<string, unknown>;

	if ('profiles' in candidate || 'documents' in candidate || 'paths' in candidate) {
		return false;
	}

	return 'defaults' in candidate || 'graphs' in candidate;
}

/**
 * Resolves the effective shapes of a legacy graph entry using the old
 * include/exclude precedence (exclusions win over inclusions).
 */
function resolveLegacyEffectiveShapes(
	defaults: readonly string[],
	config: LegacyShaclGraphShapeConfiguration
): string[] {
	const includeDefaults = config.includeDefaults !== false;
	const exclude = new Set(toUniqueStringArray(config.excludeShapes));
	const candidates = [
		...(includeDefaults ? defaults : []),
		...toUniqueStringArray(config.includeShapes),
	];

	return toUniqueStringArray(candidates.filter(shape => !exclude.has(shape)));
}

/**
 * Converts a legacy graph key (a canonical `workspace:///...` URI, optionally
 * `#fragment`-qualified) to the bare workspace-relative document key format.
 * Non-workspace keys are kept unchanged and become inert entries.
 */
function toBareDocumentKey(key: string): string {
	const match = /^workspace:\/{1,3}/.exec(key);

	if (!match) {
		return key;
	}

	const decode = (value: string) => {
		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	};

	const rest = key.slice(match[0].length);
	const hashIndex = rest.indexOf('#');

	if (hashIndex < 0) {
		return decode(rest);
	}

	return `${decode(rest.slice(0, hashIndex))}#${decode(rest.slice(hashIndex + 1))}`;
}

/**
 * Converts a legacy `{ defaults, graphs }` configuration into the
 * self-contained profile model (`{ profiles }`, each profile owning its
 * `includeFiles`/`excludeFiles`):
 *
 * - A non-empty `defaults` list becomes a profile named "Default" with a
 *   catch-all `**\/*` include entry, preserving the "defaults apply
 *   everywhere" behavior.
 * - Graph entries equivalent to implicit defaults behavior are dropped.
 * - Entries that add shapes on top of the defaults become an auto profile
 *   named after the document's bare relative path, applied to exactly that
 *   path (the catch-all still contributes the defaults).
 * - Entries that suppress the defaults (`includeDefaults: false` or
 *   exclusions) additionally append the document's path to the Default
 *   profile's `excludeFiles`; exclusions are fully resolved and frozen as the
 *   auto profile's shapes, since per-shape exclusion is not representable.
 */
export function migrateLegacyShaclValidationConfig(legacy: LegacyShaclValidationConfiguration): ShaclValidationSettings {
	const profiles: Record<string, ShaclValidationProfile> = {};
	const defaults = toUniqueStringArray(legacy.defaults);
	const defaultExclusions: string[] = [];

	if (defaults.length > 0) {
		profiles[LEGACY_DEFAULT_PROFILE_ID] = {
			name: LEGACY_DEFAULT_PROFILE_NAME,
			shapes: defaults,
			includeFiles: [LEGACY_DEFAULT_PATHS_KEY],
		};
	}

	for (const [key, graphConfig] of Object.entries(legacy.graphs ?? {})) {
		const includeDefaults = graphConfig?.includeDefaults !== false;
		const includeShapes = toUniqueStringArray(graphConfig?.includeShapes);
		const excludeShapes = toUniqueStringArray(graphConfig?.excludeShapes);

		if (includeDefaults && includeShapes.length === 0 && excludeShapes.length === 0) {
			// Implicit defaults behavior — covered by the catch-all Default profile.
			continue;
		}

		const documentKey = toBareDocumentKey(key);

		// Entries with exclusions freeze the fully-resolved selection; the defaults
		// must then be suppressed for the document so they do not re-apply via the
		// catch-all.
		const shapes = excludeShapes.length > 0
			? resolveLegacyEffectiveShapes(defaults, graphConfig)
			: includeShapes;

		if (defaults.length > 0 && (!includeDefaults || excludeShapes.length > 0)) {
			defaultExclusions.push(documentKey);
		}

		if (shapes.length > 0) {
			const id = generateProfileId(documentKey, Object.keys(profiles));

			profiles[id] = { name: documentKey, shapes, includeFiles: [documentKey] };
		}
	}

	if (defaultExclusions.length > 0) {
		const defaultProfile = profiles[LEGACY_DEFAULT_PROFILE_ID];

		defaultProfile.excludeFiles = [...(defaultProfile.excludeFiles ?? []), ...defaultExclusions];
	}

	return Object.keys(profiles).length > 0 ? { profiles } : {};
}

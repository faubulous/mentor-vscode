import { toUniqueStringArray } from '@src/utilities/array';
import {
	getExtensionGlob,
	getGlobPatternBase,
	isSafeRelativePath,
	matchGlob,
	normalizeGlobPattern,
	splitNegatedPatterns,
} from '@src/utilities/glob';
import { generateUniqueSlug } from '@src/utilities/string';

/**
 * A named, self-contained set of SHACL shape files together with the files and
 * folders it applies to.
 *
 * Profiles are stored in a record keyed by a stable, auto-generated identifier
 * (a slug derived from the display name at creation time). Nothing references
 * a profile from elsewhere in the settings — a profile owns its `includeFiles`
 * and `excludeFiles`, so renaming or deleting one never requires rewriting
 * other entries.
 */
export interface ShaclValidationProfile {
	/**
	 * Editable display name. Falls back to the profile's key (id) when absent.
	 */
	name?: string;
	/**
	 * SHACL shape files as canonical `workspace:///...` URIs.
	 */
	shapes?: string[];
	/**
	 * Workspace-relative paths this profile applies to: glob patterns
	 * (`ontologies/*`, `**\/*.ttl`) or exact file paths (`models/data.ttl`,
	 * optionally `#fragment`-qualified for notebook cells). Mirrors the index
	 * section's `includeFiles`.
	 */
	includeFiles?: string[];
	/**
	 * Workspace-relative paths excluded from the profile, in the same pattern
	 * form as {@link includeFiles} (no `!` prefix). Mirrors the index section's
	 * `excludeFiles`.
	 */
	excludeFiles?: string[];
	/**
	 * Optional human-readable description of the profile.
	 */
	description?: string;
	/**
	 * Automatically validate the profile's matched files after workspace
	 * indexing completes. Absent means false.
	 */
	validateOnStartup?: boolean;
	/**
	 * Automatically re-validate a matched document as it is edited, once it is
	 * free of syntax errors. Absent means false.
	 */
	validateOnChange?: boolean;
}

/**
 * The `mentor.shacl.validation` settings value: named, self-contained
 * validation profiles.
 */
export interface ShaclValidationSettings {
	profiles?: Record<string, ShaclValidationProfile>;
}

/**
 * The location of a document inside the workspace, as matched against the
 * profiles' include/exclude entries.
 */
export interface ShaclDocumentLocation {
	/**
	 * Workspace-relative path without a leading slash, e.g. `models/data.ttl`.
	 */
	path: string;
	/**
	 * Optional fragment identifying a notebook cell slug.
	 */
	fragment?: string;
}

/**
 * A single file or folder rename, carrying both the canonical-URI and the bare
 * workspace-relative-path form. Shape file entries are canonical
 * `workspace:///...` URIs while include/exclude entries are bare relative
 * paths, so both forms are needed to migrate a settings object.
 */
export interface ShaclDocumentRename {
	/**
	 * The old canonical `workspace:///...` URI.
	 */
	oldUri: string;
	/**
	 * The new canonical `workspace:///...` URI.
	 */
	newUri: string;
	/**
	 * The old workspace-relative path without a leading slash.
	 */
	oldPath: string;
	/**
	 * The new workspace-relative path without a leading slash.
	 */
	newPath: string;
}

/**
 * Fully-resolved validation state of a document for UI purposes.
 */
export interface ShaclDocumentValidationState {
	/**
	 * Whether any profile applies to the document.
	 */
	mode: 'matched' | 'none';
	/**
	 * Ids of the profiles applied to the document, in definition order.
	 */
	profileNames: string[];
	/**
	 * The effective union of all applied shape files.
	 */
	effectiveShapes: string[];
	/**
	 * The distinct include entries that matched the document (literal and glob).
	 */
	matchedPaths: string[];
}

/**
 * Broken references found in the validation settings: shape files that no
 * longer exist, per profile id.
 */
export interface ShaclBrokenReferences {
	/**
	 * Missing shape file URIs per profile id.
	 */
	profiles: Record<string, string[]>;
}

/**
 * Generates a stable profile id from a display name (see
 * {@link generateUniqueSlug}), falling back to `profile` for names without
 * usable characters.
 *
 * The id is minted once when a profile is first saved and never changes on
 * rename.
 */
export function generateProfileId(name: string, existingIds: readonly string[]): string {
	return generateUniqueSlug(name, existingIds, 'profile');
}

/**
 * Returns the display name of a profile: its `name` field, falling back to its id.
 */
export function getProfileDisplayName(settings: ShaclValidationSettings | undefined, id: string): string {
	return settings?.profiles?.[id]?.name ?? id;
}

/**
 * Returns true when a normalized entry is safe to match: its path part (before
 * an optional `#fragment` for notebook cells) must be free of `..` segments and
 * absolute-path syntax. See {@link isSafeRelativePath}.
 */
function isSafePathKey(normalizedKey: string): boolean {
	return isSafeRelativePath(normalizedKey.split('#', 1)[0]);
}

/**
 * Returns true when a raw include/exclude entry — optionally `!`-prefixed for an
 * exclusion — is non-empty and free of path traversal after normalization.
 * Used by the settings-UI pattern validation; the matcher applies the same
 * guard defensively.
 */
export function isValidPathKey(rawKey: string): boolean {
	const trimmed = rawKey.trim();
	const pattern = trimmed.startsWith('!') ? trimmed.slice(1) : trimmed;
	const normalized = normalizeGlobPattern(pattern);

	return normalized.length > 0 && isSafePathKey(normalized);
}

/**
 * Expands a normalized include/exclude entry into the effective glob pattern:
 *
 * - When the last path segment has no literal `.`, the pattern is
 *   extension-agnostic and the recognized RDF extensions are appended
 *   (`ontologies/*` → `ontologies/*.{ttl,...}`). A trailing bare globstar is
 *   treated as a catch-all (`**` → `**\/*.{ttl,...}`).
 * - When the entry has no literal `#`, an optional-fragment alternation is
 *   appended so the same compiled matcher also covers notebook cells of
 *   matching files (`a.ttl` → `a.ttl{#*,}`).
 */
function expandPathKey(normalizedKey: string, rdfExtensions: readonly string[]): string {
	const hashIndex = normalizedKey.indexOf('#');

	let pathPart = hashIndex >= 0 ? normalizedKey.slice(0, hashIndex) : normalizedKey;
	const fragmentPart = hashIndex >= 0 ? normalizedKey.slice(hashIndex) : undefined;

	const lastSegment = pathPart.split('/').pop() ?? pathPart;

	if (lastSegment === '**') {
		pathPart += '/*' + getExtensionGlob(rdfExtensions);
	} else if (!lastSegment.includes('.')) {
		pathPart += getExtensionGlob(rdfExtensions);
	}

	return fragmentPart !== undefined ? pathPart + fragmentPart : pathPart + '{#*,}';
}

/**
 * Tests whether a single include/exclude entry matches a document location.
 *
 * Entries use standard glob semantics matched against the workspace-relative
 * path (a single `*` does not cross `/`; use `**\/` to match at any depth).
 * Entries whose last path segment has no literal `.` automatically match only
 * the given RDF extensions; entries with a literal `#` match the fragment
 * portion (notebook cell slug) as a glob as well. Entries containing `..`
 * segments or absolute-path syntax never match. `!` exclusion prefixes are
 * handled by {@link matchesProfilePaths}, not here.
 *
 * This function is pure — the recognized RDF extension list is injected by the
 * caller (see `DocumentFactory.supportedExtensions`).
 */
export function matchesPathKey(
	rawKey: string,
	document: ShaclDocumentLocation,
	rdfExtensions: readonly string[]
): boolean {
	const normalized = normalizeGlobPattern(rawKey);

	if (!normalized || !isSafePathKey(normalized)) {
		return false;
	}

	const expanded = expandPathKey(normalized, rdfExtensions);

	return matchGlob(expanded, toDocumentPatternKey(document));
}

/**
 * Returns the settings key of a document location: its workspace-relative
 * path, `#fragment`-qualified when the location identifies a notebook cell.
 */
export function toDocumentPatternKey(document: ShaclDocumentLocation): string {
	return document.fragment ? `${document.path}#${document.fragment}` : document.path;
}

/**
 * Combines a profile's `includeFiles` and `excludeFiles` into the internal
 * match-entry form, where exclusions carry a leading `!`. The matching
 * functions operate on this combined array; the stored profile keeps the two
 * separate arrays (mirroring the index section).
 */
export function toPathEntries(
	includeFiles: readonly string[] | undefined,
	excludeFiles: readonly string[] | undefined
): string[] {
	return [
		...toUniqueStringArray(includeFiles),
		...toUniqueStringArray(excludeFiles).map(entry => `!${entry}`),
	];
}

/**
 * Returns a profile's combined match entries (see {@link toPathEntries}).
 */
export function profilePathEntries(profile: ShaclValidationProfile | undefined): string[] {
	return toPathEntries(profile?.includeFiles, profile?.excludeFiles);
}

/**
 * Tests whether a profile's include/exclude entries match a document location: at
 * least one positive entry must match and no `!`-prefixed exclusion may match.
 * A profile without positive entries matches nothing.
 */
export function matchesProfilePaths(
	paths: readonly string[] | undefined,
	document: ShaclDocumentLocation,
	rdfExtensions: readonly string[]
): boolean {
	const { positives, negatives } = splitNegatedPatterns(paths);

	if (!positives.some(entry => matchesPathKey(entry, document, rdfExtensions))) {
		return false;
	}

	return !negatives.some(entry => matchesPathKey(entry, document, rdfExtensions));
}

/**
 * Returns the ids of the profiles whose include/exclude entries match the document location,
 * in definition order.
 */
export function getMatchingProfiles(
	settings: ShaclValidationSettings | undefined,
	document: ShaclDocumentLocation,
	rdfExtensions: readonly string[]
): string[] {
	return Object.entries(settings?.profiles ?? {})
		.filter(([, profile]) => matchesProfilePaths(profilePathEntries(profile), document, rdfExtensions))
		.map(([id]) => id);
}

/**
 * Returns the id of the profile that represents an exact per-document
 * assignment for the given document key: a profile whose `includeFiles`
 * consist of exactly that literal path and which has no exclusions. Used by the
 * quick pick to find-or-create the document's auto-named profile.
 */
export function findDocumentProfileId(
	settings: ShaclValidationSettings | undefined,
	documentKey: string
): string | undefined {
	const target = normalizeGlobPattern(documentKey);

	if (!target) {
		return undefined;
	}

	for (const [id, profile] of Object.entries(settings?.profiles ?? {})) {
		const includes = toUniqueStringArray(profile?.includeFiles);
		const excludes = toUniqueStringArray(profile?.excludeFiles);

		if (includes.length === 1 && excludes.length === 0 && normalizeGlobPattern(includes[0]) === target) {
			return id;
		}
	}

	return undefined;
}

/**
 * Resolves the union of shape files of the given profiles, in id order.
 * Unknown profile ids are skipped.
 */
export function resolveProfileShapes(
	settings: ShaclValidationSettings | undefined,
	ids: readonly string[]
): string[] {
	const profiles = settings?.profiles ?? {};
	const shapes: string[] = [];

	for (const id of ids) {
		const profile = profiles[id];

		if (profile) {
			shapes.push(...toUniqueStringArray(profile.shapes));
		}
	}

	return toUniqueStringArray(shapes);
}

/**
 * Resolves the effective shape file URIs for a document: the union of the
 * shapes of every profile whose include/exclude entries match the document.
 */
export function resolveEffectiveShapeGraphs(
	settings: ShaclValidationSettings | undefined,
	document: ShaclDocumentLocation,
	rdfExtensions: readonly string[]
): string[] {
	return resolveProfileShapes(settings, getMatchingProfiles(settings, document, rdfExtensions));
}

/**
 * An automatic validation trigger: the per-profile flag that opts a profile
 * into it.
 */
export type ShaclAutoValidationTrigger = 'validateOnStartup' | 'validateOnChange';

/**
 * Returns the ids of the profiles that opt into the given automatic
 * validation trigger, in definition order.
 */
export function getAutoValidationProfiles(
	settings: ShaclValidationSettings | undefined,
	trigger: ShaclAutoValidationTrigger
): string[] {
	return Object.entries(settings?.profiles ?? {})
		.filter(([, profile]) => profile?.[trigger] === true)
		.map(([id]) => id);
}

/**
 * Resolves the union of shape files of the profiles that both match the
 * document and opt into the given automatic validation trigger.
 */
export function resolveAutoValidationShapeGraphs(
	settings: ShaclValidationSettings | undefined,
	document: ShaclDocumentLocation,
	rdfExtensions: readonly string[],
	trigger: ShaclAutoValidationTrigger
): string[] {
	const optedIn = new Set(getAutoValidationProfiles(settings, trigger));
	const ids = getMatchingProfiles(settings, document, rdfExtensions).filter(id => optedIn.has(id));

	return resolveProfileShapes(settings, ids);
}

/**
 * Returns the fully-resolved validation state of a document for UI initialization.
 */
export function getDocumentValidationState(
	settings: ShaclValidationSettings | undefined,
	document: ShaclDocumentLocation,
	rdfExtensions: readonly string[]
): ShaclDocumentValidationState {
	const matchedIds: string[] = [];
	const matchedPaths: string[] = [];

	for (const [id, profile] of Object.entries(settings?.profiles ?? {})) {
		const { positives, negatives } = splitNegatedPatterns(profilePathEntries(profile));
		const matchedPositives = positives.filter(entry => matchesPathKey(entry, document, rdfExtensions));

		if (matchedPositives.length === 0) {
			continue;
		}

		if (negatives.some(entry => matchesPathKey(entry, document, rdfExtensions))) {
			continue;
		}

		matchedIds.push(id);
		matchedPaths.push(...matchedPositives);
	}

	return {
		mode: matchedIds.length > 0 ? 'matched' : 'none',
		profileNames: matchedIds,
		effectiveShapes: resolveProfileShapes(settings, matchedIds),
		matchedPaths: toUniqueStringArray(matchedPaths),
	};
}

/**
 * Whether a shape URI addresses a workspace file (`workspace:///...`).
 * String-based so it is usable in the settings webview, which cannot import vscode.
 */
export function isWorkspaceShapeUri(uri: string): boolean {
	return uri.startsWith('workspace:');
}

/**
 * Whether a shape URI addresses a user shape file (`user:///...`), i.e. one
 * stored in the user settings and available in every workspace.
 */
export function isUserShapeUri(uri: string): boolean {
	return uri.startsWith('user:');
}

/**
 * Whether a profile's shape references bind it to the workspace scope.
 * Workspace shape URIs are meaningless outside the workspace they were created
 * in, so a profile referencing one cannot be stored in the user scope. Profiles
 * referencing only bundled graphs and user shapes are portable.
 */
export function requiresWorkspaceScope(shapes: readonly string[] | undefined): boolean {
	return (shapes ?? []).some(isWorkspaceShapeUri);
}

/**
 * Returns all shape file URIs referenced by the profiles.
 */
export function getAllReferencedShapeUris(settings: ShaclValidationSettings | undefined): string[] {
	const uris: string[] = [];

	for (const profile of Object.values(settings?.profiles ?? {})) {
		uris.push(...toUniqueStringArray(profile?.shapes));
	}

	return toUniqueStringArray(uris);
}

/**
 * Finds broken references in the validation settings: shape files that no
 * longer exist, per profile.
 *
 * This function is pure — file existence is injected by the caller.
 */
export function findBrokenReferences(
	settings: ShaclValidationSettings | undefined,
	fileExists: (uri: string) => boolean
): ShaclBrokenReferences {
	const result: ShaclBrokenReferences = { profiles: {} };

	for (const [id, profile] of Object.entries(settings?.profiles ?? {})) {
		const missing = toUniqueStringArray(profile?.shapes).filter(uri => !fileExists(uri));

		if (missing.length > 0) {
			result.profiles[id] = missing;
		}
	}

	return result;
}

/**
 * Returns true when the given broken-references result contains any entries.
 */
export function hasBrokenReferences(broken: ShaclBrokenReferences): boolean {
	return Object.keys(broken.profiles).length > 0;
}

/**
 * Rewrites a value under a renamed prefix. Matches the whole value, a `/`
 * path-segment boundary, or a `#` fragment boundary (notebook cell keys), so
 * renaming `models` does not affect `models-extra/thing.ttl`.
 */
function rewritePrefixed(value: string, oldKey: string, newKey: string): string | undefined {
	if (value === oldKey || value.startsWith(oldKey + '/') || value.startsWith(oldKey + '#')) {
		return newKey + value.slice(oldKey.length);
	}

	return undefined;
}

/**
 * Migrates SHACL validation settings when files or folders are renamed.
 *
 * Shape file entries are canonical `workspace:///...` URIs and are rewritten
 * by exact prefix using the renames' URI forms. Include/exclude entries are rewritten
 * on their fixed literal prefix (`picomatch.scan().base`, the whole string for
 * a literal path) using the bare-path forms, so a folder-scoped pattern and an
 * exact document path both follow a rename while a root-anchored pattern like
 * `**\/*.ttl` (no fixed prefix) is left untouched. `!` exclusion prefixes are
 * preserved.
 *
 * This function is pure: it returns a new settings object and does not write
 * to VS Code settings. The caller is responsible for persisting the result.
 */
export function migrateShaclValidationConfig(
	settings: ShaclValidationSettings | undefined,
	renames: readonly ShaclDocumentRename[]
): ShaclValidationSettings {
	if (!settings) {
		return {};
	}

	const migrateUri = (uri: string): string => {
		for (const { oldUri, newUri } of renames) {
			const rewritten = rewritePrefixed(uri, oldUri, newUri);

			if (rewritten !== undefined) {
				return rewritten;
			}
		}

		return uri;
	};

	const migratePathEntry = (entry: string): string => {
		const base = getGlobPatternBase(entry);

		if (!base) {
			return entry;
		}

		for (const { oldPath, newPath } of renames) {
			const rewritten = rewritePrefixed(base, oldPath, newPath);

			if (rewritten !== undefined) {
				return rewritten + entry.slice(base.length);
			}
		}

		return entry;
	};

	let migratedProfiles: Record<string, ShaclValidationProfile> | undefined;

	if (settings.profiles) {
		migratedProfiles = {};

		for (const [id, profile] of Object.entries(settings.profiles)) {
			migratedProfiles[id] = {
				...profile,
				...(profile?.shapes !== undefined ? { shapes: profile.shapes.map(migrateUri) } : {}),
				...(profile?.includeFiles !== undefined ? { includeFiles: profile.includeFiles.map(migratePathEntry) } : {}),
				...(profile?.excludeFiles !== undefined ? { excludeFiles: profile.excludeFiles.map(migratePathEntry) } : {}),
			};
		}
	}

	return {
		...settings,
		...(migratedProfiles !== undefined ? { profiles: migratedProfiles } : {}),
	};
}

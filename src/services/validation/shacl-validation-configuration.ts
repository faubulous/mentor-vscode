import picomatch from 'picomatch';

/**
 * A named, self-contained set of SHACL shape files together with the paths it
 * applies to.
 *
 * Profiles are stored in a record keyed by a stable, auto-generated identifier
 * (a slug derived from the display name at creation time). Nothing references
 * a profile from elsewhere in the settings — a profile owns its `paths`, so
 * renaming or deleting one never requires rewriting other entries.
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
	 * optionally `#fragment`-qualified for notebook cells). Entries prefixed
	 * with `!` exclude matching documents from the profile.
	 */
	paths?: string[];
	/**
	 * Optional human-readable description of the profile.
	 */
	description?: string;
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
 * profiles' `paths` entries.
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
 * `workspace:///...` URIs while `paths` entries are bare relative paths, so
 * both forms are needed to migrate a settings object.
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
	 * The distinct `paths` entries that matched the document (literal and glob).
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
 * Generates a stable profile id from a display name: lowercased, runs of
 * non-alphanumeric characters collapsed to `-`, trimmed, falling back to
 * `profile` for names without usable characters. On a collision with an
 * existing id, a numeric suffix (`-2`, `-3`, ...) is appended.
 *
 * The id is minted once when a profile is first saved and never changes on
 * rename.
 */
export function generateProfileId(name: string, existingIds: readonly string[]): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		|| 'profile';

	const taken = new Set(existingIds);

	if (!taken.has(slug)) {
		return slug;
	}

	for (let suffix = 2; ; suffix++) {
		const candidate = `${slug}-${suffix}`;

		if (!taken.has(candidate)) {
			return candidate;
		}
	}
}

/**
 * Returns the display name of a profile: its `name` field, falling back to its id.
 */
export function getProfileDisplayName(settings: ShaclValidationSettings | undefined, id: string): string {
	return settings?.profiles?.[id]?.name ?? id;
}

/**
 * Returns true when the given string contains glob syntax (including negation).
 * Never throws on malformed input.
 */
export function isGlobPattern(pattern: string): boolean {
	try {
		const scanned = picomatch.scan(pattern);

		return scanned.isGlob === true || scanned.negated === true;
	} catch {
		return false;
	}
}

/**
 * Builds the glob suffix appended to extension-less patterns so they only match
 * the currently-recognized RDF file extensions, e.g. `.{ttl,n3,nt,nq,trig,rdf}`.
 * Returns an empty string when no extensions are given (the pattern is then
 * left untouched).
 */
export function getRdfExtensionGlob(rdfExtensions: readonly string[]): string {
	const names = toUniqueStringArray([...rdfExtensions]).map(ext => ext.replace(/^\.+/, '').toLowerCase()).filter(Boolean);

	if (names.length === 0) {
		return '';
	}

	return names.length === 1 ? `.${names[0]}` : `.{${names.join(',')}}`;
}

/**
 * Normalizes a raw `paths` entry: trims, converts backslashes to slashes and
 * strips leading `./`/`/` and trailing `/` sequences.
 */
function normalizePathKey(rawKey: string): string {
	return rawKey
		.trim()
		.replace(/\\/g, '/')
		.replace(/^(?:\.\/+|\/+)+/, '')
		.replace(/\/+$/, '');
}

/**
 * Returns true when a normalized pattern is safe to match: it must not contain
 * `..` segments or absolute-path-looking syntax (drive letters). Consistent
 * with the path-traversal guarding of `WorkspaceUri`.
 */
function isSafePathKey(normalizedKey: string): boolean {
	if (/^[a-zA-Z]:/.test(normalizedKey)) {
		return false;
	}

	const pathPart = normalizedKey.split('#', 1)[0];

	return !pathPart.split('/').some(segment => segment === '..');
}

/**
 * Returns true when a raw `paths` entry — optionally `!`-prefixed for an
 * exclusion — is non-empty and free of path traversal after normalization.
 * Used by the settings-UI pattern validation; the matcher applies the same
 * guard defensively.
 */
export function isValidPathKey(rawKey: string): boolean {
	const trimmed = rawKey.trim();
	const pattern = trimmed.startsWith('!') ? trimmed.slice(1) : trimmed;
	const normalized = normalizePathKey(pattern);

	return normalized.length > 0 && isSafePathKey(normalized);
}

/**
 * Expands a normalized `paths` entry into the effective glob pattern:
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
		pathPart += '/*' + getRdfExtensionGlob(rdfExtensions);
	} else if (!lastSegment.includes('.')) {
		pathPart += getRdfExtensionGlob(rdfExtensions);
	}

	return fragmentPart !== undefined ? pathPart + fragmentPart : pathPart + '{#*,}';
}

/**
 * Compiled matchers per expanded pattern string. Safe to memoize at module
 * level: a compiled matcher for a given pattern string is always identical.
 */
const matcherCache = new Map<string, picomatch.Matcher>();

/**
 * Tests whether a single `paths` entry matches a document location.
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
	const normalized = normalizePathKey(rawKey);

	if (!normalized || !isSafePathKey(normalized)) {
		return false;
	}

	const expanded = expandPathKey(normalized, rdfExtensions);

	let matcher = matcherCache.get(expanded);

	if (!matcher) {
		try {
			matcher = picomatch(expanded, { dot: true });
		} catch {
			return false;
		}

		matcherCache.set(expanded, matcher);
	}

	return matcher(toDocumentPatternKey(document));
}

/**
 * Returns the settings key of a document location: its workspace-relative
 * path, `#fragment`-qualified when the location identifies a notebook cell.
 */
export function toDocumentPatternKey(document: ShaclDocumentLocation): string {
	return document.fragment ? `${document.path}#${document.fragment}` : document.path;
}

/**
 * Whether a raw `paths` entry is a `!`-prefixed exclusion. Leading whitespace
 * is ignored so entries edited by hand behave the same as trimmed ones.
 */
export function isExclusionEntry(entry: string): boolean {
	return entry.trimStart().startsWith('!');
}

/**
 * Strips the `!` exclusion prefix (and any leading whitespace) from a raw
 * `paths` entry. Positive entries are returned unchanged apart from the trim.
 */
export function stripExclusionPrefix(entry: string): string {
	const trimmed = entry.trimStart();

	return trimmed.startsWith('!') ? trimmed.slice(1) : trimmed;
}

/**
 * Splits a profile's `paths` entries into positive patterns and `!`-prefixed
 * exclusions (with the `!` stripped).
 */
export function splitPathEntries(paths: readonly string[] | undefined): { positives: string[]; negatives: string[] } {
	const positives: string[] = [];
	const negatives: string[] = [];

	for (const entry of toUniqueStringArray([...(paths ?? [])])) {
		if (isExclusionEntry(entry)) {
			negatives.push(stripExclusionPrefix(entry));
		} else {
			positives.push(entry);
		}
	}

	return { positives, negatives };
}

/**
 * Tests whether a profile's `paths` entries match a document location: at
 * least one positive entry must match and no `!`-prefixed exclusion may match.
 * A profile without positive entries matches nothing.
 */
export function matchesProfilePaths(
	paths: readonly string[] | undefined,
	document: ShaclDocumentLocation,
	rdfExtensions: readonly string[]
): boolean {
	const { positives, negatives } = splitPathEntries(paths);

	if (!positives.some(entry => matchesPathKey(entry, document, rdfExtensions))) {
		return false;
	}

	return !negatives.some(entry => matchesPathKey(entry, document, rdfExtensions));
}

/**
 * Returns the ids of the profiles whose `paths` match the document location,
 * in definition order.
 */
export function getMatchingProfiles(
	settings: ShaclValidationSettings | undefined,
	document: ShaclDocumentLocation,
	rdfExtensions: readonly string[]
): string[] {
	return Object.entries(settings?.profiles ?? {})
		.filter(([, profile]) => matchesProfilePaths(profile?.paths, document, rdfExtensions))
		.map(([id]) => id);
}

/**
 * Returns the id of the profile that represents an exact per-document
 * assignment for the given document key: a profile whose `paths` consist of
 * exactly that literal path. Used by the quick pick to find-or-create the
 * document's auto-named profile.
 */
export function findDocumentProfileId(
	settings: ShaclValidationSettings | undefined,
	documentKey: string
): string | undefined {
	const target = normalizePathKey(documentKey);

	if (!target) {
		return undefined;
	}

	for (const [id, profile] of Object.entries(settings?.profiles ?? {})) {
		const entries = toUniqueStringArray([...(profile?.paths ?? [])]);

		if (entries.length === 1 && normalizePathKey(entries[0]) === target) {
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
 * shapes of every profile whose `paths` match the document.
 */
export function resolveEffectiveShapeGraphs(
	settings: ShaclValidationSettings | undefined,
	document: ShaclDocumentLocation,
	rdfExtensions: readonly string[]
): string[] {
	return resolveProfileShapes(settings, getMatchingProfiles(settings, document, rdfExtensions));
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
		const { positives, negatives } = splitPathEntries(profile?.paths);
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
 * Returns the fixed literal prefix of a glob pattern (`picomatch.scan().base`),
 * which degenerates to the whole string for a literal-looking key. Root-anchored
 * patterns like `**\/*.ttl` have no fixed prefix and yield an empty string.
 * Used to follow folder renames and deletions for `paths` entries.
 */
export function getPathPatternBase(pattern: string): string {
	try {
		return picomatch.scan(pattern).base ?? '';
	} catch {
		return '';
	}
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
 * by exact prefix using the renames' URI forms. `paths` entries are rewritten
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
		const negated = entry.startsWith('!');
		const pattern = negated ? entry.slice(1) : entry;
		const base = getPathPatternBase(pattern);

		if (!base) {
			return entry;
		}

		for (const { oldPath, newPath } of renames) {
			const rewritten = rewritePrefixed(base, oldPath, newPath);

			if (rewritten !== undefined) {
				return (negated ? '!' : '') + rewritten + pattern.slice(base.length);
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
				...(profile?.paths !== undefined ? { paths: profile.paths.map(migratePathEntry) } : {}),
			};
		}
	}

	return {
		...settings,
		...(migratedProfiles !== undefined ? { profiles: migratedProfiles } : {}),
	};
}

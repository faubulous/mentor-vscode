import picomatch from 'picomatch';
import { toUniqueStringArray } from './array';

/**
 * Normalizes a raw glob pattern or relative path: trims, converts backslashes
 * to slashes and strips leading `./`/`/` and trailing `/` sequences, so
 * patterns match consistently against normalized workspace-relative paths.
 */
export function normalizeGlobPattern(pattern: string): string {
	return pattern
		.trim()
		.replace(/\\/g, '/')
		.replace(/^(?:\.\/+|\/+)+/, '')
		.replace(/\/+$/, '');
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
 * Returns the fixed literal prefix of a glob pattern (`picomatch.scan().base`),
 * which degenerates to the whole string for a literal-looking pattern.
 * Root-anchored patterns like `**\/*.ttl` have no fixed prefix and yield an
 * empty string. Used to follow folder renames and deletions for patterns.
 */
export function getGlobPatternBase(pattern: string): string {
	try {
		return picomatch.scan(pattern).base ?? '';
	} catch {
		return '';
	}
}

/**
 * Compiled matchers per pattern string. Safe to memoize at module level: a
 * compiled matcher for a given pattern string is always identical.
 */
const matcherCache = new Map<string, picomatch.Matcher>();

/**
 * Tests whether a glob pattern matches an input string, compiling the pattern
 * with `{ dot: true }` and caching the compiled matcher. Returns `false` when
 * the pattern fails to compile.
 */
export function matchGlob(pattern: string, input: string): boolean {
	let matcher = matcherCache.get(pattern);

	if (!matcher) {
		try {
			matcher = picomatch(pattern, { dot: true });
		} catch {
			return false;
		}

		matcherCache.set(pattern, matcher);
	}

	return matcher(input);
}

/**
 * Builds the glob suffix that restricts a pattern to the given file
 * extensions, e.g. `.{ttl,n3,nt}` (or `.ttl` for a single extension).
 * Returns an empty string when no extensions are given.
 */
export function getExtensionGlob(extensions: readonly string[]): string {
	const names = toUniqueStringArray(extensions).map(ext => ext.replace(/^\.+/, '').toLowerCase()).filter(Boolean);

	if (names.length === 0) {
		return '';
	}

	return names.length === 1 ? `.${names[0]}` : `.{${names.join(',')}}`;
}

/**
 * Returns true when a normalized relative path is safe to match against
 * workspace-relative paths: no `..` segments and no absolute-path-looking
 * syntax (drive letters). Consistent with the path-traversal guarding of
 * `WorkspaceUri`.
 */
export function isSafeRelativePath(path: string): boolean {
	if (/^[a-zA-Z]:/.test(path)) {
		return false;
	}

	return !path.split('/').some(segment => segment === '..');
}

/**
 * Whether a raw pattern is a `!`-prefixed negation (gitignore-style). Leading
 * whitespace is ignored so entries edited by hand behave the same as trimmed
 * ones.
 */
export function isNegatedPattern(pattern: string): boolean {
	return pattern.trimStart().startsWith('!');
}

/**
 * Strips the `!` negation prefix (and any leading whitespace) from a raw
 * pattern. Positive patterns are returned unchanged apart from the trim.
 */
export function stripNegationPrefix(pattern: string): string {
	const trimmed = pattern.trimStart();

	return trimmed.startsWith('!') ? trimmed.slice(1) : trimmed;
}

/**
 * Splits patterns into positive patterns and `!`-prefixed negations (with the
 * `!` stripped), dropping duplicates and empty entries.
 */
export function splitNegatedPatterns(patterns: readonly string[] | undefined): { positives: string[]; negatives: string[] } {
	const positives: string[] = [];
	const negatives: string[] = [];

	for (const entry of toUniqueStringArray(patterns)) {
		if (isNegatedPattern(entry)) {
			negatives.push(stripNegationPrefix(entry));
		} else {
			positives.push(entry);
		}
	}

	return { positives, negatives };
}

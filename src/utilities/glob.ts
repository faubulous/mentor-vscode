import { Minimatch, MinimatchOptions, unescape } from 'minimatch';
import { toUniqueStringArray } from './array';

/**
 * Tests whether a workspace-relative path matches a compiled glob pattern.
 */
export type GlobMatcher = (input: string) => boolean;

/**
 * How every glob pattern is read: dot files match, and the backslash escapes on every platform,
 * as the paths it is matched against are normalized to forward slashes everywhere.
 */
const GLOB_OPTIONS: MinimatchOptions = { dot: true, platform: 'linux' };

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
 * What is known of each pattern string that has been asked about: whether it is a glob and its
 * fixed literal prefix. Safe to memoize at module level, as both depend on the string alone, and
 * parsing a pattern costs far more than looking it up.
 */
const isGlobCache = new Map<string, boolean>();
const baseCache = new Map<string, string>();

/**
 * Returns true when the given string contains glob syntax (including negation).
 * Never throws on malformed input.
 */
export function isGlobPattern(pattern: string): boolean {
	let isGlob = isGlobCache.get(pattern);

	if (isGlob === undefined) {
		try {
			const parsed = new Minimatch(pattern, GLOB_OPTIONS);

			isGlob = parsed.negate || parsed.hasMagic();
		} catch {
			isGlob = false;
		}

		isGlobCache.set(pattern, isGlob);
	}

	return isGlob;
}

/**
 * Returns the fixed literal prefix of a glob pattern as it is written: its leading path segments
 * that are literal in every expansion of its braces, without a `!` negation. A literal-looking
 * pattern yields the whole string. Root-anchored patterns like `**\/*.ttl` have no fixed prefix and
 * yield an empty string. Used to follow folder renames and deletions for patterns.
 */
export function getGlobPatternBase(pattern: string): string {
	let base = baseCache.get(pattern);

	if (base === undefined) {
		try {
			const text = pattern.replace(/^!+/, '');
			const parsed = new Minimatch(text, { ...GLOB_OPTIONS, optimizationLevel: 0 });

			base = text.split('/').slice(0, _literalSegmentCount(text, parsed.set)).join('/');
		} catch {
			base = '';
		}

		baseCache.set(pattern, base);
	}

	return base;
}

/**
 * Count the leading segments of a pattern that are literal in every expansion of its braces and
 * read as the text writes them.
 * @param text The pattern without its negation.
 * @param expansions The segments of each expansion of the pattern.
 * @returns The number of segments.
 */
function _literalSegmentCount(text: string, expansions: Minimatch['set']): number {
	const written = text.split('/');
	let count = 0;

	while (count < written.length) {
		const literal = expansions[0]?.[count];

		if (typeof literal !== 'string' || expansions.some(segments => segments[count] !== literal) || unescape(written[count], GLOB_OPTIONS) !== literal) {
			break;
		}

		count++;
	}

	return count;
}

/**
 * Compiles a glob pattern into a matcher of workspace-relative paths, with dot-file support. Stray
 * brackets and parentheses are read as literal characters, so only a pattern the parser rejects
 * outright, such as one that is too long, fails.
 * @param pattern The pattern.
 * @returns The matcher.
 * @throws {TypeError} If the pattern cannot be compiled.
 */
export function compileGlob(pattern: string): GlobMatcher {
	const parsed = new Minimatch(pattern, GLOB_OPTIONS);

	return input => parsed.match(input);
}

/**
 * Compiled matchers per pattern string. Safe to memoize at module level: a
 * compiled matcher for a given pattern string is always identical.
 */
const matcherCache = new Map<string, GlobMatcher>();

/**
 * Tests whether a glob pattern matches an input string, compiling the pattern
 * with dot-file support and caching the compiled matcher. Returns `false` when
 * the pattern fails to compile.
 */
export function matchGlob(pattern: string, input: string): boolean {
	let matcher = matcherCache.get(pattern);

	if (!matcher) {
		try {
			matcher = compileGlob(pattern);
		} catch {
			return false;
		}

		matcherCache.set(pattern, matcher);
	}

	return matcher(input);
}

/**
 * Tests whether any of several glob patterns matches an input string, as
 * {@link matchGlob} tests one. Patterns that fail to compile match nothing.
 * @param patterns The patterns.
 * @param input The workspace-relative path.
 * @returns `true` when a pattern matches.
 */
export function matchAnyGlob(patterns: readonly string[], input: string): boolean {
	return patterns.some(pattern => matchGlob(pattern, input));
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

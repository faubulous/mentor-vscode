import { describe, expect, it } from 'vitest';
import {
	compileGlob,
	getExtensionGlob,
	getGlobPatternBase,
	isGlobPattern,
	isNegatedPattern,
	isSafeRelativePath,
	matchAnyGlob,
	matchGlob,
	normalizeGlobPattern,
	splitNegatedPatterns,
	stripNegationPrefix,
} from './glob';

describe('normalizeGlobPattern', () => {
	it('trims and converts backslashes to slashes', () => {
		expect(normalizeGlobPattern('  models\\data.ttl ')).toBe('models/data.ttl');
	});

	it('strips leading ./ and / sequences', () => {
		expect(normalizeGlobPattern('./models/data.ttl')).toBe('models/data.ttl');
		expect(normalizeGlobPattern('/models/data.ttl')).toBe('models/data.ttl');
		expect(normalizeGlobPattern('.//./models')).toBe('models');
	});

	it('strips trailing slashes', () => {
		expect(normalizeGlobPattern('models/')).toBe('models');
		expect(normalizeGlobPattern('models//')).toBe('models');
	});
});

describe('isGlobPattern', () => {
	it('detects glob syntax including negation', () => {
		expect(isGlobPattern('*.ttl')).toBe(true);
		expect(isGlobPattern('**/models/*')).toBe(true);
		expect(isGlobPattern('!ontologies/*.ttl')).toBe(true);
		expect(isGlobPattern('models/data.ttl')).toBe(false);
		expect(isGlobPattern('')).toBe(false);
	});

	it('detects braces, character classes, single characters and extglobs, but not escaped wildcards', () => {
		expect(isGlobPattern('*.{ttl,nt}')).toBe(true);
		expect(isGlobPattern('models/[ab]*.ttl')).toBe(true);
		expect(isGlobPattern('models/?.ttl')).toBe(true);
		expect(isGlobPattern('models/@(a|b).ttl')).toBe(true);
		expect(isGlobPattern('models/\\*.ttl')).toBe(false);
	});
});

describe('getGlobPatternBase', () => {
	it('returns the fixed literal prefix of a glob pattern', () => {
		expect(getGlobPatternBase('models/*.ttl')).toBe('models');
		expect(getGlobPatternBase('models/data.ttl')).toBe('models/data.ttl');
	});

	it('yields an empty string for root-anchored patterns', () => {
		expect(getGlobPatternBase('**/*.ttl')).toBe('');
		expect(getGlobPatternBase('*.ttl')).toBe('');
		expect(getGlobPatternBase('**/.git/**')).toBe('');
	});

	it('returns the segments every expansion of braces shares, without a negation', () => {
		expect(getGlobPatternBase('a/{b,c}/*.ttl')).toBe('a');
		expect(getGlobPatternBase('data/**/*.{ttl,n3}')).toBe('data');
		expect(getGlobPatternBase('!models/*.ttl')).toBe('models');
		expect(getGlobPatternBase('models/**/x/**/*.ttl')).toBe('models');
	});

	it('returns the prefix as the pattern writes it, escapes included, so it can be cut from the pattern', () => {
		expect(getGlobPatternBase('models/\\*.ttl')).toBe('models/\\*.ttl');
		expect(getGlobPatternBase('.vscode/**')).toBe('.vscode');
	});
});

describe('matchGlob', () => {
	it('matches with dot-file support', () => {
		expect(matchGlob('models/*.ttl', 'models/data.ttl')).toBe(true);
		expect(matchGlob('models/*.ttl', 'models/.hidden.ttl')).toBe(true);
		expect(matchGlob('models/*.ttl', 'other/data.ttl')).toBe(false);
	});

	it('does not cross path separators with a single star', () => {
		expect(matchGlob('models/*.ttl', 'models/nested/data.ttl')).toBe(false);
		expect(matchGlob('models/**/*.ttl', 'models/nested/data.ttl')).toBe(true);
	});

	it('matches dot folders, braces, classes and extglobs, case-sensitively', () => {
		expect(matchGlob('**/.git/**', 'src/.git/config')).toBe(true);
		expect(matchGlob('**/node_modules/**', 'x/node_modules/y/z.ttl')).toBe(true);
		expect(matchGlob('data/**/*.{ttl,n3}', 'data/q/r.n3')).toBe(true);
		expect(matchGlob('data/**/*.{ttl,n3}', 'data/q/r.nt')).toBe(false);
		expect(matchGlob('models/[ab]*.ttl', 'models/b.ttl')).toBe(true);
		expect(matchGlob('models/[ab]*.ttl', 'models/c.ttl')).toBe(false);
		expect(matchGlob('models/@(a|b).ttl', 'models/a.ttl')).toBe(true);
		expect(matchGlob('models/@(a|b).ttl', 'models/ab.ttl')).toBe(false);
		expect(matchGlob('Models/*.ttl', 'models/data.ttl')).toBe(false);
	});

	it('reads an escaped wildcard as the character itself', () => {
		expect(matchGlob('models/\\*.ttl', 'models/*.ttl')).toBe(true);
		expect(matchGlob('models/\\*.ttl', 'models/data.ttl')).toBe(false);
	});
});

describe('compileGlob', () => {
	it('compiles a pattern into a matcher of workspace-relative paths', () => {
		const matcher = compileGlob('ontologies/*.trig');

		expect(matcher('ontologies/o.trig')).toBe(true);
		expect(matcher('ontologies/o.ttl')).toBe(false);
	});

	it('reads stray brackets and parentheses literally', () => {
		expect(compileGlob('a/[')('a/[')).toBe(true);
		expect(compileGlob('a/(')('a/(')).toBe(true);
	});
});

describe('matchAnyGlob', () => {
	it('matches when any of the patterns does', () => {
		expect(matchAnyGlob(['**/.git/**', 'models/*.ttl'], 'models/data.ttl')).toBe(true);
		expect(matchAnyGlob(['**/.git/**', 'models/*.ttl'], 'data/data.ttl')).toBe(false);
		expect(matchAnyGlob([], 'models/data.ttl')).toBe(false);
	});
});

describe('getExtensionGlob', () => {
	it('builds a brace group for several extensions', () => {
		expect(getExtensionGlob(['.ttl', '.n3'])).toBe('.{ttl,n3}');
	});

	it('returns a plain suffix for a single extension', () => {
		expect(getExtensionGlob(['.ttl'])).toBe('.ttl');
	});

	it('returns an empty string for an empty list', () => {
		expect(getExtensionGlob([])).toBe('');
	});
});

describe('isSafeRelativePath', () => {
	it('rejects paths with .. segments or drive letters', () => {
		expect(isSafeRelativePath('../secrets.ttl')).toBe(false);
		expect(isSafeRelativePath('models/../secrets.ttl')).toBe(false);
		expect(isSafeRelativePath('C:/models/data.ttl')).toBe(false);
	});

	it('accepts plain workspace-relative paths', () => {
		expect(isSafeRelativePath('models/data.ttl')).toBe(true);
		expect(isSafeRelativePath('a..b/data.ttl')).toBe(true);
	});
});

describe('splitNegatedPatterns', () => {
	it('splits positives from !-prefixed negations and strips the prefix', () => {
		expect(splitNegatedPatterns(['models/*', '!models/tmp/*', ' !x.ttl'])).toEqual({
			positives: ['models/*'],
			negatives: ['models/tmp/*', 'x.ttl'],
		});
	});

	it('handles undefined and drops duplicates', () => {
		expect(splitNegatedPatterns(undefined)).toEqual({ positives: [], negatives: [] });
		expect(splitNegatedPatterns(['a', 'a'])).toEqual({ positives: ['a'], negatives: [] });
	});
});

describe('isNegatedPattern / stripNegationPrefix', () => {
	it('ignores leading whitespace', () => {
		expect(isNegatedPattern('  !models/*')).toBe(true);
		expect(isNegatedPattern('models/*')).toBe(false);
		expect(stripNegationPrefix('  !models/*')).toBe('models/*');
		expect(stripNegationPrefix('models/*')).toBe('models/*');
	});
});

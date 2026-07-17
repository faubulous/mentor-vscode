import { describe, expect, it } from 'vitest';
import {
	getExtensionGlob,
	getGlobPatternBase,
	isGlobPattern,
	isNegatedPattern,
	isSafeRelativePath,
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
});

describe('getGlobPatternBase', () => {
	it('returns the fixed literal prefix of a glob pattern', () => {
		expect(getGlobPatternBase('models/*.ttl')).toBe('models');
		expect(getGlobPatternBase('models/data.ttl')).toBe('models/data.ttl');
	});

	it('yields an empty string for root-anchored patterns', () => {
		expect(getGlobPatternBase('**/*.ttl')).toBe('');
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

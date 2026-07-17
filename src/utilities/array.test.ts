import { describe, expect, it } from 'vitest';
import { toUniqueStringArray } from './array';

describe('toUniqueStringArray', () => {
	it('keeps first occurrence order and removes non-string/empty values', () => {
		expect(toUniqueStringArray(['a', 'b', 'a', '', '  ', 2, 'c', 'b'] as any)).toEqual(['a', 'b', 'c']);
	});

	it('returns an empty array for non-array inputs', () => {
		expect(toUniqueStringArray(undefined)).toEqual([]);
		expect(toUniqueStringArray(null)).toEqual([]);
		expect(toUniqueStringArray('a')).toEqual([]);
		expect(toUniqueStringArray({})).toEqual([]);
	});

	it('trims entries before deduplicating', () => {
		expect(toUniqueStringArray([' a ', 'a', 'b '])).toEqual(['a', 'b']);
	});
});

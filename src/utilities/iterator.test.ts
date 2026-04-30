import { describe, it, expect } from 'vitest';
import { any, take } from '@src/utilities/iterator';

describe('any', () => {
	it('returns true for a non-empty iterator', () => {
		expect(any([1, 2, 3].values())).toBe(true);
	});

	it('returns false for an empty iterator', () => {
		expect(any([].values())).toBe(false);
	});

	it('returns true for a single-element iterator', () => {
		expect(any(['x'].values())).toBe(true);
	});

	it('does not fully consume the iterator (stops at first item)', () => {
		let count = 0;
		function* gen() {
			while (true) {
				count++;
				yield count;
			}
		}
		// If any() reads more than 1 item from an infinite generator it would hang
		expect(any(gen())).toBe(true);
		expect(count).toBe(1);
	});
});

describe('take', () => {
	it('returns up to count items', () => {
		expect(take([1, 2, 3, 4, 5].values(), 3)).toEqual([1, 2, 3]);
	});

	it('returns all items when count exceeds the iterator length', () => {
		expect(take([1, 2].values(), 10)).toEqual([1, 2]);
	});

	it('returns an empty array for count 0', () => {
		expect(take([1, 2, 3].values(), 0)).toEqual([]);
	});

	it('returns an empty array for an empty iterator', () => {
		expect(take([].values(), 5)).toEqual([]);
	});

	it('returns exactly count items when count equals length', () => {
		expect(take(['a', 'b', 'c'].values(), 3)).toEqual(['a', 'b', 'c']);
	});
});

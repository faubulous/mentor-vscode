import { describe, it, expect } from 'vitest';
import { getMaxCellSlugNumber } from '@src/services/notebook/notebook-cell-slugs';

function makeNotebook(slugs: (string | undefined)[]): any {
	return {
		getCells: () => slugs.map(slug => ({ metadata: slug === undefined ? {} : { slug } })),
	};
}

describe('getMaxCellSlugNumber', () => {
	it('returns 0 for a notebook without cells', () => {
		expect(getMaxCellSlugNumber(makeNotebook([]))).toBe(0);
	});

	it('returns 0 when no cell has a slug', () => {
		expect(getMaxCellSlugNumber(makeNotebook([undefined, undefined]))).toBe(0);
	});

	it('returns the highest auto-generated slug number', () => {
		expect(getMaxCellSlugNumber(makeNotebook(['cell-1', 'cell-7', 'cell-3']))).toBe(7);
	});

	it('ignores manually named slugs', () => {
		expect(getMaxCellSlugNumber(makeNotebook(['my-data', 'cell-2', 'cell-10-b']))).toBe(2);
	});
});

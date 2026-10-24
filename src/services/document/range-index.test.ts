import { describe, it, expect } from 'vitest';
import { Range } from 'vscode-languageserver-types';
import { RangeIndex } from '@src/services/document/range-index';

const first = Range.create(1, 2, 1, 10);
const second = Range.create(5, 0, 6, 3);

describe('RangeIndex', () => {
	it('is empty when created', () => {
		const index = new RangeIndex();

		expect(index.size).toBe(0);
		expect(index.has('a')).toBe(false);
		expect(index.count('a')).toBe(0);
		expect(index.first('a')).toBeUndefined();
		expect(index.getRanges('a')).toEqual([]);
		expect([...index.keys()]).toEqual([]);
	});

	it('records ranges per key in insertion order', () => {
		const index = new RangeIndex();

		index.add('a', first);
		index.add('a', second);
		index.add('b', second);

		expect(index.size).toBe(2);
		expect([...index.keys()]).toEqual(['a', 'b']);
		expect(index.has('a')).toBe(true);
		expect(index.count('a')).toBe(2);
		expect(index.first('a')).toEqual(first);
		expect(index.getRanges('a')).toEqual([first, second]);
		expect(index.getRanges('b')).toEqual([second]);
	});

	it('returns plain ranges that do not alias the stored data', () => {
		const index = new RangeIndex();

		index.add('a', first);

		const range = index.first('a')!;

		range.start.line = 99;

		expect(index.first('a')).toEqual(first);
	});

	it('replaces the ranges of a key on set', () => {
		const index = new RangeIndex();

		index.add('a', first);
		index.add('a', second);
		index.set('a', second);

		expect(index.getRanges('a')).toEqual([second]);
	});

	it('round-trips through a plain record', () => {
		const record = { a: [first, second], b: [second] };
		const index = RangeIndex.fromRecord(record);

		expect(index.toRecord()).toEqual(record);
	});

	it('forgets everything on clear', () => {
		const index = RangeIndex.fromRecord({ a: [first] });

		index.clear();

		expect(index.size).toBe(0);
		expect(index.has('a')).toBe(false);
	});
});

import { describe, it, expect } from 'vitest';
import { patchRecord, patchNestedRecord } from './webview-utils';

describe('patchRecord', () => {
	it('updates an existing entry', () => {
		const record = { key: 'old', other: 'keep' };
		const result = patchRecord(record, 'key', prev => {
			expect(prev).toBe('old');
			return 'new';
		});
		expect(result).toEqual({ key: 'new', other: 'keep' });
	});

	it('inserts a new entry when the key is absent', () => {
		const record = { existing: 'value' };
		const result = patchRecord(record, 'new-key', prev => {
			expect(prev).toBeUndefined();
			return 'inserted';
		});
		expect(result).toEqual({ existing: 'value', 'new-key': 'inserted' });
	});

	it('deletes the entry when mutate returns undefined', () => {
		const record = { key: 'value', other: 'keep' };
		const result = patchRecord(record, 'key', () => undefined);
		expect(result).toEqual({ other: 'keep' });
	});

	it('is a no-op when the key is absent and mutate returns undefined', () => {
		const record = { other: 'keep' };
		const result = patchRecord(record, 'missing', () => undefined);
		expect(result).toEqual({ other: 'keep' });
	});

	it('preserves referential equality of untouched entries', () => {
		const value = { nested: true };
		const record = { a: value, b: { nested: false } };
		const result = patchRecord(record, 'b', () => ({ nested: true }));
		expect(result.a).toBe(value);
	});
});

describe('patchNestedRecord', () => {
	it('updates an existing entry', () => {
		const outer = { source: { key: 'old', other: 'keep' } };
		const result = patchNestedRecord(outer, 'source', 'key', prev => {
			expect(prev).toBe('old');
			return 'new';
		});
		expect(result).toEqual({ source: { key: 'new', other: 'keep' } });
	});

	it('inserts a new entry when the inner key is absent', () => {
		const outer = { source: { existing: 'value' } };
		const result = patchNestedRecord(outer, 'source', 'new-key', prev => {
			expect(prev).toBeUndefined();
			return 'inserted';
		});
		expect(result).toEqual({ source: { existing: 'value', 'new-key': 'inserted' } });
	});

	it('deletes the entry when mutate returns undefined', () => {
		const outer = { source: { key: 'value', other: 'keep' } };
		const result = patchNestedRecord(outer, 'source', 'key', () => undefined);
		expect(result).toEqual({ source: { other: 'keep' } });
	});

	it('is a no-op when the inner key is absent and mutate returns undefined', () => {
		const outer = { source: { other: 'keep' } };
		const result = patchNestedRecord(outer, 'source', 'missing', () => undefined);
		expect(result).toEqual({ source: { other: 'keep' } });
	});

	it('preserves referential equality of untouched source slices', () => {
		const outer = { sourceA: { key: 'a' }, sourceB: { key: 'b' } };
		const result = patchNestedRecord(outer, 'sourceA', 'key', () => 'updated');
		expect(result.sourceB).toBe(outer.sourceB);
	});
});

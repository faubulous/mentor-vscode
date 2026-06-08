import { describe, it, expect } from 'vitest';
import { patchNestedRecord } from './webview-utils';

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

	it('deletes the entry when mut returns undefined', () => {
		const outer = { source: { key: 'value', other: 'keep' } };
		const result = patchNestedRecord(outer, 'source', 'key', () => undefined);
		expect(result).toEqual({ source: { other: 'keep' } });
	});

	it('is a no-op when the inner key is absent and mut returns undefined', () => {
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

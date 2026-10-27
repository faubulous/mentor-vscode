import { describe, expect, it } from 'vitest';
import { CellKey } from './cell-key';

describe('CellKey', () => {
	it('round trips through its text form, even when the resource id holds the separator', () => {
		const key = new CellKey({ resourceId: 'i:http://example.org/a|b', column: 'value', propertyIndex: 2, valueIndex: 1 });
		const parsed = CellKey.parse(key.toString());

		expect(key.toString()).toBe('i:http://example.org/a|b|value|2|1|');
		expect(parsed).toEqual(key);
		expect(parsed?.equals(key)).toBe(true);
		expect(parsed?.equals(new CellKey({ resourceId: 'i:x', column: 'value' }))).toBe(false);
		expect(parsed?.equals(undefined)).toBe(false);
	});

	it('leaves out the indices a column does not have', () => {
		expect(CellKey.parse(new CellKey({ resourceId: 'b:1', column: 'subject' }).toString())).toEqual(new CellKey({ resourceId: 'b:1', column: 'subject' }));
		expect(CellKey.parse('i:x|value|0|0|2')?.itemIndex).toBe(2);
	});

	it('rejects a malformed text', () => {
		expect(CellKey.parse('i:x|line')).toBeUndefined();
	});

	it('tells the cells of a property row', () => {
		expect(new CellKey({ resourceId: 'i:x', column: 'line', propertyIndex: 1 }).isInRow('i:x', 1)).toBe(true);
		expect(new CellKey({ resourceId: 'i:x', column: 'value', propertyIndex: 1, valueIndex: 0 }).isInRow('i:x', 1)).toBe(true);
		expect(new CellKey({ resourceId: 'i:x', column: 'line', propertyIndex: 2 }).isInRow('i:x', 1)).toBe(false);
		expect(new CellKey({ resourceId: 'i:x', column: 'subject' }).isInRow('i:x', 1)).toBe(false);
	});

	it('translates focus hints', () => {
		expect(CellKey.fromFocusHint({ resourceId: 'i:x', target: 'value', propertyIndex: 1, valueIndex: 0 }).toString()).toBe('i:x|line|1||');
		expect(CellKey.fromFocusHint({ resourceId: 'i:x', target: 'value', propertyIndex: 1, valueIndex: 0, itemIndex: 3 }).toString()).toBe('i:x|line|1||');
		expect(CellKey.fromFocusHint({ resourceId: 'i:x', target: 'predicate', propertyIndex: 2 }).toString()).toBe('i:x|line|2||');
		expect(CellKey.fromFocusHint({ resourceId: 'b:2', parentId: 'i:x', target: 'addProperty' }).toString()).toBe('b:2|line|0||');
		expect(CellKey.fromFocusHint({ resourceId: 'i:x', target: 'subject' }).toString()).toBe('i:x|subject|||');
	});
});

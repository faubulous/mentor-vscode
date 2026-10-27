import { describe, expect, it } from 'vitest';
import { buildCellKey, cellKeyFromFocusHint, parseCellKey, resourceIdOfCell } from './cell-key';

describe('cell keys', () => {
	it('round trip through build and parse, even when the resource id holds the separator', () => {
		const key = buildCellKey({ resourceId: 'i:http://example.org/a|b', column: 'value', propertyIndex: 2, valueIndex: 1 });

		expect(parseCellKey(key)).toEqual({ resourceId: 'i:http://example.org/a|b', column: 'value', propertyIndex: 2, valueIndex: 1, itemIndex: undefined });
		expect(resourceIdOfCell(key)).toBe('i:http://example.org/a|b');
	});

	it('leaves out the indices a column does not have', () => {
		expect(parseCellKey(buildCellKey({ resourceId: 'b:1', column: 'subject' }))).toEqual({ resourceId: 'b:1', column: 'subject', propertyIndex: undefined, valueIndex: undefined, itemIndex: undefined });
		expect(parseCellKey(buildCellKey({ resourceId: 'i:x', column: 'value', propertyIndex: 0, valueIndex: 0, itemIndex: 2 }))?.itemIndex).toBe(2);
	});

	it('rejects a malformed key', () => {
		expect(parseCellKey('i:x|line')).toBeUndefined();
		expect(resourceIdOfCell('i:x|line')).toBe('i:x|line');
	});

	it('translates focus hints', () => {
		expect(cellKeyFromFocusHint({ resourceId: 'i:x', target: 'value', propertyIndex: 1, valueIndex: 0 })).toBe('i:x|line|1||');
		expect(cellKeyFromFocusHint({ resourceId: 'i:x', target: 'value', propertyIndex: 1, valueIndex: 0, itemIndex: 3 })).toBe('i:x|line|1||');
		expect(cellKeyFromFocusHint({ resourceId: 'i:x', target: 'predicate', propertyIndex: 2 })).toBe('i:x|line|2||');
		expect(cellKeyFromFocusHint({ resourceId: 'b:2', parentId: 'i:x', target: 'addProperty' })).toBe('b:2|line|0||');
		expect(cellKeyFromFocusHint({ resourceId: 'i:x', target: 'subject' })).toBe('i:x|subject|||');
	});

	it('addresses statement lines and the draft line', () => {
		expect(parseCellKey(buildCellKey({ resourceId: 'i:x', column: 'line', propertyIndex: 3 }))).toMatchObject({ resourceId: 'i:x', column: 'line', propertyIndex: 3 });
		expect(parseCellKey(buildCellKey({ resourceId: 'i:x', column: 'draft' }))).toMatchObject({ resourceId: 'i:x', column: 'draft' });
	});
});

import { describe, expect, it } from 'vitest';
import { CellKey } from './cell-key';

describe('CellKey', () => {
	it('compares by its text form and leaves out the value for the row', () => {
		const key = new CellKey({ resourceId: 'i:http://example.org/a|b', column: 'statement', propertyIndex: 2, valueIndex: 1 });

		expect(key.toString()).toBe('i:http://example.org/a|b|statement|2|1');
		expect(key.equals(new CellKey({ resourceId: 'i:http://example.org/a|b', column: 'statement', propertyIndex: 2, valueIndex: 1 }))).toBe(true);
		expect(key.equals(undefined)).toBe(false);
		const row = key.row();

		expect(row.toString()).toBe('i:http://example.org/a|b|statement|2|');
		expect(row.row()).toBe(row);
	});

	it('tells the statement row of a property', () => {
		expect(new CellKey({ resourceId: 'i:x', column: 'statement', propertyIndex: 1 }).isInRow('i:x', 1)).toBe(true);
		expect(new CellKey({ resourceId: 'i:x', column: 'statement', propertyIndex: 1, valueIndex: 0 }).isInRow('i:x', 1)).toBe(true);
		expect(new CellKey({ resourceId: 'i:x', column: 'statement', propertyIndex: 2 }).isInRow('i:x', 1)).toBe(false);
		expect(new CellKey({ resourceId: 'i:x', column: 'draft', propertyIndex: 1 }).isInRow('i:x', 1)).toBe(false);
	});

	it('translates focus hints into the row of their property', () => {
		expect(CellKey.fromFocusHint({ resourceId: 'i:x', target: 'value', propertyIndex: 1, valueIndex: 0 }).toString()).toBe('i:x|statement|1|0');
		expect(CellKey.fromFocusHint({ resourceId: 'i:x', target: 'predicate', propertyIndex: 2 }).toString()).toBe('i:x|statement|2|');
		expect(CellKey.fromFocusHint({ resourceId: 'b:2', parentId: 'i:x', target: 'addProperty' }).toString()).toBe('b:2|statement|0|');
		expect(CellKey.fromFocusHint({ resourceId: 'i:x', target: 'subject' }).toString()).toBe('i:x|statement|0|');
		expect(CellKey.fromFocusHint({ resourceId: 'i:x', target: 'comment', propertyIndex: 2 }).toString()).toBe('i:x|comment|2|');
	});
});

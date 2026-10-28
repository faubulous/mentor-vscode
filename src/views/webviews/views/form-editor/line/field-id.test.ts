import { describe, expect, it } from 'vitest';
import { FieldId } from './field-id';

describe('FieldId', () => {
	it('writes and reads every kind of field', () => {
		const ids = [FieldId.PREDICATE, FieldId.NEW_VALUE, FieldId.value(2), FieldId.tag(3)];

		expect(ids.map(String)).toEqual(['predicate', 'newValue', 'value:2', 'tag:3']);
		expect(ids.map(id => FieldId.parse(id.toString()))).toEqual(ids);
		expect(FieldId.parse('value:')).toBeUndefined();
		expect(FieldId.parse('comment')).toBeUndefined();
	});

	it('names the value a field belongs to', () => {
		expect(FieldId.tag(2).index).toBe(2);
		expect(FieldId.value(1).index).toBe(1);
		expect(FieldId.NEW_VALUE.index).toBeUndefined();
	});

	it('compares by kind and index', () => {
		expect(FieldId.value(1).equals(FieldId.value(1))).toBe(true);
		expect(FieldId.value(1).equals(FieldId.tag(1))).toBe(false);
		expect(FieldId.PREDICATE.equals(undefined)).toBe(false);
	});
});

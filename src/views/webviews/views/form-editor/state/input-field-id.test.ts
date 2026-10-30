import { describe, expect, it } from 'vitest';
import { InputFieldId } from './input-field-id';

describe('InputFieldId', () => {
	it('writes and reads the fields of a row', () => {
		expect(InputFieldId.PREDICATE.toString()).toBe('predicate');
		expect(InputFieldId.value(2).toString()).toBe('value:2');
		expect(InputFieldId.parse('tag:1')).toEqual(InputFieldId.tag(1));
		expect(InputFieldId.parse('newValue')).toBe(InputFieldId.NEW_VALUE);
		expect(InputFieldId.parse('value:')).toBeUndefined();
	});

	it('compares by kind and index', () => {
		expect(InputFieldId.value(1).equals(InputFieldId.value(1))).toBe(true);
		expect(InputFieldId.value(1).equals(InputFieldId.tag(1))).toBe(false);
		expect(InputFieldId.value(1).equals(undefined)).toBe(false);
	});
});

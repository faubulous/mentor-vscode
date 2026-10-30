import { describe, expect, it } from 'vitest';
import { InputFieldId } from './input-field-id';
import { EditableStatement } from './editable-statement';

/**
 * The statement the tests share: a tagged literal, a nested node and a resource.
 */
const STATEMENT = new EditableStatement('rdfs:label', [{ kind: 'literal', value: 'Tree', suffix: '@en' }, { kind: 'nestedNode' }, { kind: 'resource', text: 'ex:A' }]);

describe('EditableStatement', () => {
	it('walks the predicate, each literal with its tag, each pill and the input, passing nested nodes', () => {
		expect(STATEMENT.fieldOrder().map(String)).toEqual(['predicate', 'value:0', 'tag:0', 'value:2', 'newValue']);
		expect(EditableStatement.EMPTY.fieldOrder().map(String)).toEqual(['predicate', 'newValue']);
	});

	it('has an input after its pills, or as its one field while empty, but none among literals', () => {
		expect(STATEMENT.hasNewValueField).toBe(true);
		expect(EditableStatement.EMPTY.hasNewValueField).toBe(true);
		expect(new EditableStatement('rdfs:label', [{ kind: 'literal', value: 'Tree', suffix: '@en' }]).fieldOrder().map(String)).toEqual(['predicate', 'value:0', 'tag:0']);
	});

	it('passes the pills when walking the stops of Tab', () => {
		expect(STATEMENT.tabOrder().map(String)).toEqual(['predicate', 'value:0', 'tag:0', 'newValue']);
		expect(STATEMENT.neighbourField(InputFieldId.tag(0), 'next', true)).toBe(InputFieldId.NEW_VALUE);
		expect(STATEMENT.neighbourField(InputFieldId.tag(0), 'next')).toEqual(InputFieldId.value(2));
	});

	it('finds the field before and after, and nothing past the ends', () => {
		expect(STATEMENT.neighbourField(InputFieldId.value(0), 'next')).toEqual(InputFieldId.tag(0));
		expect(STATEMENT.neighbourField(InputFieldId.tag(0), 'next')).toEqual(InputFieldId.value(2));
		expect(STATEMENT.neighbourField(InputFieldId.value(0), 'previous')).toBe(InputFieldId.PREDICATE);
		expect(STATEMENT.neighbourField(InputFieldId.PREDICATE, 'previous')).toBeUndefined();
		expect(STATEMENT.neighbourField(InputFieldId.NEW_VALUE, 'next')).toBeUndefined();
		expect(STATEMENT.neighbourField(InputFieldId.value(1), 'next')).toBeUndefined();
	});

	it('ends with its input, or with its last literal', () => {
		expect(STATEMENT.lastField()).toBe(InputFieldId.NEW_VALUE);
		expect(EditableStatement.EMPTY.lastField()).toBe(InputFieldId.NEW_VALUE);
		expect(new EditableStatement('rdfs:label', [{ kind: 'literal', value: 'a', suffix: '' }, { kind: 'literal', value: 'b', suffix: '@de' }]).lastField()).toEqual(InputFieldId.value(1));
	});

	it('is empty without a predicate or without values', () => {
		expect(EditableStatement.EMPTY.isEmpty).toBe(true);
		expect(new EditableStatement('ex:p', []).isEmpty).toBe(true);
		expect(new EditableStatement(' ', [{ kind: 'resource', text: 'ex:A' }]).isEmpty).toBe(true);
		expect(STATEMENT.isEmpty).toBe(false);
	});

	it('replaces, appends and removes values and replaces the predicate without touching the original', () => {
		const replaced = STATEMENT.withValue(2, { kind: 'resource', text: 'ex:B' });
		const appended = STATEMENT.withValueAppended({ kind: 'shorthandLiteral', text: '1' });
		const removed = STATEMENT.withoutValue(0);

		expect(replaced.values[2]).toEqual({ kind: 'resource', text: 'ex:B' });
		expect(appended.values).toHaveLength(4);
		expect(removed.values).toEqual([{ kind: 'nestedNode' }, { kind: 'resource', text: 'ex:A' }]);
		expect(STATEMENT.withPredicate('a').predicate).toBe('a');
		expect(STATEMENT.values).toHaveLength(3);
		expect(STATEMENT.predicate).toBe('rdfs:label');
	});
});

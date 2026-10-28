import { describe, expect, it } from 'vitest';
import { InputFieldKeyContext } from './input-field-key-context';
import { InputFieldKeyResolver } from './input-field-key-resolver';
import { InputFieldKeyboardEvent } from './input-field-keyboard-event';

const BASE: InputFieldKeyContext = { field: 'newValue', empty: false, atStart: false, atEnd: true, onFirstLine: true, onLastLine: true, rowEmpty: false };
const resolver = new InputFieldKeyResolver();

/**
 * Resolve a key in a field described by overrides of the base context.
 */
function resolve(key: string, context: Partial<InputFieldKeyContext> = {}, modifiers: Partial<InputFieldKeyboardEvent> = {}) {
	return resolver.resolve({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: false, ...modifiers }, { ...BASE, ...context });
}

describe('InputFieldKeyResolver', () => {
	it('moves from the predicate to the values with Space and walks the fields with Tab', () => {
		expect(resolve(' ', { field: 'predicate' })).toEqual({ kind: 'nextField' });
		expect(resolve('Tab', { field: 'predicate' })).toEqual({ kind: 'nextField' });
		expect(resolve('Tab', { field: 'literalText' })).toEqual({ kind: 'nextField' });
		expect(resolve('Tab', { field: 'newValue' }, { shiftKey: true })).toEqual({ kind: 'previousField' });
	});

	it('confirms a typed resource with Space or a comma at its end', () => {
		expect(resolve(' ', { field: 'resourceText' })).toEqual({ kind: 'commitField' });
		expect(resolve(',', { field: 'newValue' })).toEqual({ kind: 'commitField' });
		expect(resolve(' ', { field: 'newValue', atEnd: false })).toBeUndefined();
		expect(resolve(' ', { field: 'literalText' })).toBeUndefined();
	});

	it('crosses fields with the arrows at their edges and always from a pill', () => {
		expect(resolve('ArrowLeft', { field: 'literalText', atStart: true })).toEqual({ kind: 'previousField' });
		expect(resolve('ArrowLeft', { field: 'literalText', atStart: false })).toBeUndefined();
		expect(resolve('ArrowRight', { field: 'resourcePill', atEnd: false })).toEqual({ kind: 'nextField' });
	});

	it('deletes a pill whole and the value before the new field', () => {
		expect(resolve('Backspace', { field: 'resourcePill' })).toEqual({ kind: 'removeField' });
		expect(resolve('Delete', { field: 'resourcePill' })).toEqual({ kind: 'removeField', forward: true });
		expect(resolve('Backspace', { field: 'newValue', empty: true, atStart: true })).toEqual({ kind: 'removePrevious' });
		expect(resolve('Backspace', { field: 'literalText', empty: true, atStart: true })).toEqual({ kind: 'removeField' });
		expect(resolve('Backspace', { field: 'literalText', empty: false, atStart: true })).toBeUndefined();
	});

	it('deletes an empty row from its predicate, and any row with Ctrl+Shift+K', () => {
		expect(resolve('Backspace', { field: 'predicate', empty: true, atStart: true, rowEmpty: true })).toEqual({ kind: 'deleteRow' });
		expect(resolve('Backspace', { field: 'predicate', empty: true, atStart: true, rowEmpty: false })).toBeUndefined();
		expect(resolve('K', { field: 'literalText' }, { ctrlKey: true, shiftKey: true })).toEqual({ kind: 'removeField' });
		expect(resolve('K', { field: 'predicate' }, { ctrlKey: true, shiftKey: true })).toEqual({ kind: 'deleteRow' });
		expect(resolve('K', { field: 'newValue' }, { ctrlKey: true, shiftKey: true })).toBeUndefined();
	});

	it('adds a value with Enter in a value and breaks a literal with Shift+Enter', () => {
		expect(resolve('Enter', { field: 'resourceText' })).toEqual({ kind: 'addValue' });
		expect(resolve('Enter', { field: 'literalText' })).toEqual({ kind: 'addValue' });
		expect(resolve('Enter', { field: 'resourcePill' })).toEqual({ kind: 'addValue' });
		expect(resolve('Enter', { field: 'literalText' }, { shiftKey: true })).toBeUndefined();
	});

	it('confirms a typed value with Enter and leaves for the row below from the empty field for a new value', () => {
		expect(resolve('Enter', { field: 'newValue' })).toEqual({ kind: 'commitField' });
		expect(resolve('Enter', { field: 'newValue', empty: true })).toEqual({ kind: 'nextRow' });
		expect(resolve('Enter', { field: 'predicate' })).toEqual({ kind: 'nextField' });
		expect(resolve('Enter', { field: 'predicate', rowEmpty: true })).toEqual({ kind: 'nextRow' });
	});

	it('edits a pill as text with F2 or a typed character', () => {
		expect(resolve('F2', { field: 'resourcePill' })).toEqual({ kind: 'editPill' });
		expect(resolve('F2', { field: 'literalText' })).toBeUndefined();
		expect(resolve('x', { field: 'resourcePill' })).toEqual({ kind: 'editPill', seed: 'x' });
	});

	it('starts the tag of a literal with @ or a second ^ at the end of its text, once', () => {
		expect(resolve('@', { field: 'literalText' })).toEqual({ kind: 'startSuffix', marker: '@' });
		expect(resolve('^', { field: 'literalText', previousCharacter: '^' })).toEqual({ kind: 'startSuffix', marker: '^^' });
		expect(resolve('^', { field: 'literalText', previousCharacter: 'x' })).toBeUndefined();
		expect(resolve('@', { field: 'literalText', atEnd: false })).toBeUndefined();
		expect(resolve('@', { field: 'literalText', empty: true })).toBeUndefined();
		expect(resolve('@', { field: 'literalText', hasSuffix: true })).toBeUndefined();
	});

	it('removes an emptied tag and crosses from it', () => {
		expect(resolve('Backspace', { field: 'literalTag', empty: true, atStart: true })).toEqual({ kind: 'removeSuffix' });
		expect(resolve('Backspace', { field: 'literalTag', empty: false, atStart: false })).toBeUndefined();
		expect(resolve('ArrowLeft', { field: 'literalTag', atStart: true })).toEqual({ kind: 'previousField' });
		expect(resolve('Enter', { field: 'literalTag' })).toEqual({ kind: 'addValue' });
	});

	it('turns typed characters in the new value into their meaning', () => {
		expect(resolve('"', { field: 'newValue', empty: true })).toEqual({ kind: 'startLiteral' });
		expect(resolve('"', { field: 'literalText' })).toBeUndefined();
		expect(resolve('@', { field: 'newValue' })).toEqual({ kind: 'startSuffix', marker: '@' });
		expect(resolve('@', { field: 'newValue', looksLikeName: true })).toBeUndefined();
		expect(resolve('@', { field: 'newValue', empty: true })).toBeUndefined();
	});

	it('moves between rows at the first and last line of a field', () => {
		expect(resolve('ArrowDown', { field: 'literalText', onLastLine: false })).toBeUndefined();
		expect(resolve('ArrowDown', { field: 'literalText' })).toEqual({ kind: 'rowDown' });
		expect(resolve('ArrowUp', { field: 'literalText', onFirstLine: false })).toBeUndefined();
		expect(resolve('ArrowUp', { field: 'literalText' })).toEqual({ kind: 'rowUp' });
	});

	it('moves to the start or end of the row with Home or End at the edge of a field', () => {
		expect(resolve('Home', { field: 'literalText', atStart: true })).toEqual({ kind: 'rowStart' });
		expect(resolve('Home', { field: 'literalText', atStart: false })).toBeUndefined();
		expect(resolve('End', { field: 'predicate', atEnd: true })).toEqual({ kind: 'rowEnd' });
		expect(resolve('End', { field: 'resourcePill', atEnd: false })).toEqual({ kind: 'rowEnd' });
		expect(resolve('Home', { field: 'literalText', atStart: true }, { shiftKey: true })).toBeUndefined();
	});

	it('restores with Escape and leaves other modifiers and composition to the field', () => {
		expect(resolve('Escape', { field: 'literalText' })).toEqual({ kind: 'restore' });
		expect(resolve('ArrowUp', { field: 'literalText' }, { altKey: true })).toBeUndefined();
		expect(resolve('z', { field: 'literalText' }, { ctrlKey: true })).toBeUndefined();
		expect(resolve('a', { field: 'resourcePill' }, { isComposing: true })).toBeUndefined();
		expect(resolve('Process', { field: 'resourcePill' })).toBeUndefined();
	});
});

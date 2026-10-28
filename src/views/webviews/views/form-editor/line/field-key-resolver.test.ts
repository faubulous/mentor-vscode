import { describe, expect, it } from 'vitest';
import { FieldKeyContext } from './field-key-context';
import { FieldKeyResolver } from './field-key-resolver';
import { FieldKeyboardEvent } from './field-keyboard-event';

const BASE: FieldKeyContext = { field: 'newValue', popupOpen: false, empty: false, atStart: false, atEnd: true, onFirstLine: true, onLastLine: true, rowEmpty: false };
const resolver = new FieldKeyResolver();

/**
 * Resolve a key in a field described by overrides of the base context.
 */
function resolve(key: string, context: Partial<FieldKeyContext> = {}, modifiers: Partial<FieldKeyboardEvent> = {}) {
	return resolver.resolve({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: false, ...modifiers }, { ...BASE, ...context });
}

describe('FieldKeyResolver', () => {
	it('lets the popup take the arrows, Enter, Tab and Escape while open', () => {
		expect(resolve('ArrowDown', { popupOpen: true })).toEqual({ kind: 'popupMove', delta: 1 });
		expect(resolve('Tab', { popupOpen: true })).toEqual({ kind: 'popupAccept' });
		expect(resolve('Escape', { popupOpen: true })).toEqual({ kind: 'popupClose' });
		expect(resolve(' ', {}, { ctrlKey: true })).toEqual({ kind: 'popupOpen' });
	});

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

	it('deletes an empty row from its predicate', () => {
		expect(resolve('Backspace', { field: 'predicate', empty: true, atStart: true, rowEmpty: true })).toEqual({ kind: 'deleteLine' });
		expect(resolve('Backspace', { field: 'predicate', empty: true, atStart: true, rowEmpty: false })).toBeUndefined();
	});

	it('adds a value with Enter in a value and breaks a literal with Shift+Enter', () => {
		expect(resolve('Enter', { field: 'resourceText' })).toEqual({ kind: 'addValue' });
		expect(resolve('Enter', { field: 'literalText' })).toEqual({ kind: 'addValue' });
		expect(resolve('Enter', { field: 'resourcePill' })).toEqual({ kind: 'addValue' });
		expect(resolve('Enter', { field: 'nestedNodeCard' })).toEqual({ kind: 'addValue' });
		expect(resolve('Enter', { field: 'literalText' }, { shiftKey: true })).toBeUndefined();
	});

	it('confirms a typed value with Enter and opens a statement below from the empty field for a new value', () => {
		expect(resolve('Enter', { field: 'newValue' })).toEqual({ kind: 'commitField' });
		expect(resolve('Enter', { field: 'newValue', empty: true })).toEqual({ kind: 'newLine' });
		expect(resolve('Enter', { field: 'predicate' })).toEqual({ kind: 'nextField' });
		expect(resolve('Enter', { field: 'predicate', rowEmpty: true })).toEqual({ kind: 'newLine' });
	});

	it('edits a pill as text with F2 or a typed character', () => {
		expect(resolve('F2', { field: 'resourcePill' })).toEqual({ kind: 'editPill' });
		expect(resolve('F2', { field: 'literalText' })).toBeUndefined();
		expect(resolve('x', { field: 'resourcePill' })).toEqual({ kind: 'editPill', seed: 'x' });
	});

	it('moves a value among the values with Alt+Up/Down, and the statement from its predicate', () => {
		expect(resolve('ArrowUp', { field: 'literalText' }, { altKey: true })).toEqual({ kind: 'moveValue', direction: 'up' });
		expect(resolve('ArrowDown', { field: 'nestedNodeCard' }, { altKey: true })).toEqual({ kind: 'moveValue', direction: 'down' });
		expect(resolve('ArrowDown', { field: 'predicate' }, { altKey: true })).toEqual({ kind: 'moveLine', direction: 'down' });
		expect(resolve('ArrowUp', { field: 'newValue' }, { altKey: true })).toEqual({ kind: 'moveLine', direction: 'up' });
	});

	it('deletes the value or the statement the caret is on with Ctrl+Shift+K', () => {
		expect(resolve('K', { field: 'literalText' }, { ctrlKey: true, shiftKey: true })).toEqual({ kind: 'removeField' });
		expect(resolve('K', { field: 'predicate' }, { ctrlKey: true, shiftKey: true })).toEqual({ kind: 'deleteLine' });
		expect(resolve('K', { field: 'newValue' }, { ctrlKey: true, shiftKey: true })).toBeUndefined();
	});

	it('starts the tag of a literal with @ or a second ^ at the end of its text, once', () => {
		expect(resolve('@', { field: 'literalText' })).toEqual({ kind: 'startSuffix', marker: '@' });
		expect(resolve('^', { field: 'literalText', previousCharacter: '^' })).toEqual({ kind: 'startSuffix', marker: '^^' });
		expect(resolve('^', { field: 'literalText', previousCharacter: 'x' })).toBeUndefined();
		expect(resolve('@', { field: 'literalText', atEnd: false })).toBeUndefined();
		expect(resolve('@', { field: 'literalText', empty: true })).toBeUndefined();
		expect(resolve('@', { field: 'literalText', hasSuffix: true })).toBeUndefined();
	});

	it('removes an emptied tag, and moves and deletes its literal from it', () => {
		expect(resolve('Backspace', { field: 'literalTag', empty: true, atStart: true })).toEqual({ kind: 'removeSuffix' });
		expect(resolve('Backspace', { field: 'literalTag', empty: false, atStart: false })).toBeUndefined();
		expect(resolve('ArrowLeft', { field: 'literalTag', atStart: true })).toEqual({ kind: 'previousField' });
		expect(resolve('ArrowUp', { field: 'literalTag' }, { altKey: true })).toEqual({ kind: 'moveValue', direction: 'up' });
		expect(resolve('Enter', { field: 'literalTag' })).toEqual({ kind: 'addValue' });
	});

	it('removes the card of a nested node whole and crosses it with the arrows', () => {
		expect(resolve('Backspace', { field: 'nestedNodeCard' })).toEqual({ kind: 'removeField' });
		expect(resolve('Delete', { field: 'nestedNodeCard' })).toEqual({ kind: 'removeField', forward: true });
		expect(resolve('ArrowRight', { field: 'nestedNodeCard', atEnd: false })).toEqual({ kind: 'nextField' });
		expect(resolve('ArrowDown', { field: 'nestedNodeCard' })).toEqual({ kind: 'lineDown' });
		expect(resolve('x', { field: 'nestedNodeCard' })).toBeUndefined();
	});

	it('turns typed characters in the new value into their meaning', () => {
		expect(resolve('"', { field: 'newValue', empty: true })).toEqual({ kind: 'startLiteral' });
		expect(resolve('"', { field: 'literalText' })).toBeUndefined();
		expect(resolve('@', { field: 'newValue' })).toEqual({ kind: 'startSuffix', marker: '@' });
		expect(resolve('@', { field: 'newValue', looksLikeName: true })).toBeUndefined();
		expect(resolve('@', { field: 'newValue', empty: true })).toBeUndefined();
		expect(resolve('#', { field: 'predicate', rowEmpty: true, empty: true })).toBeUndefined();
	});

	it('moves between lines at the first and last line of a field', () => {
		expect(resolve('ArrowDown', { field: 'literalText', onLastLine: false })).toBeUndefined();
		expect(resolve('ArrowDown', { field: 'literalText' })).toEqual({ kind: 'lineDown' });
		expect(resolve('ArrowUp', { field: 'literalText', onFirstLine: false })).toBeUndefined();
		expect(resolve('ArrowUp', { field: 'literalText' })).toEqual({ kind: 'lineUp' });
	});

	it('moves to the start or end of the row with Home or End at the edge of a field', () => {
		expect(resolve('Home', { field: 'literalText', atStart: true })).toEqual({ kind: 'rowStart' });
		expect(resolve('Home', { field: 'literalText', atStart: false })).toBeUndefined();
		expect(resolve('End', { field: 'predicate', atEnd: true })).toEqual({ kind: 'rowEnd' });
		expect(resolve('End', { field: 'resourcePill', atEnd: false })).toEqual({ kind: 'rowEnd' });
		expect(resolve('Home', { field: 'literalText', atStart: true }, { shiftKey: true })).toBeUndefined();
	});

	it('leaves with Escape, opens the menu and ignores keys while composing', () => {
		expect(resolve('Escape', { field: 'literalText' })).toEqual({ kind: 'leave' });
		expect(resolve('.', {}, { ctrlKey: true })).toEqual({ kind: 'openMenu' });
		expect(resolve('F10', {}, { shiftKey: true })).toEqual({ kind: 'openMenu' });
		expect(resolve('a', { field: 'resourcePill' }, { isComposing: true })).toBeUndefined();
		expect(resolve('Process', { field: 'resourcePill' })).toBeUndefined();
	});
});

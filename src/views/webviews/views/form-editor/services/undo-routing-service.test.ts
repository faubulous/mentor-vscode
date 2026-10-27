import { describe, expect, it } from 'vitest';
import { UndoKeyboardEvent, UndoRoutingService } from './undo-routing-service';

const field = {};
const other = {};

/**
 * Focus a field and type into it once, changing its value from the given text.
 */
function typed(service: UndoRoutingService, target: object, before: string): void {
	service.focus(target);
	service.beforeInput(target, before, 'insertText');
}

/**
 * Make a key event.
 */
function key(value: string, modifiers: Partial<Omit<UndoKeyboardEvent, 'key'>> = {}): UndoKeyboardEvent {
	return { key: value, ctrlKey: false, metaKey: false, shiftKey: false, ...modifiers };
}

describe('UndoRoutingService.commandOf', () => {
	it('reads undo and redo from Ctrl or Cmd with Z and Y', () => {
		expect(UndoRoutingService.commandOf(key('z', { ctrlKey: true }))).toBe('undo');
		expect(UndoRoutingService.commandOf(key('Z', { metaKey: true, shiftKey: true }))).toBe('redo');
		expect(UndoRoutingService.commandOf(key('y', { ctrlKey: true }))).toBe('redo');
	});

	it('ignores other keys and keys without the modifier', () => {
		expect(UndoRoutingService.commandOf(key('z'))).toBeUndefined();
		expect(UndoRoutingService.commandOf(key('x', { ctrlKey: true }))).toBeUndefined();
	});
});

describe('UndoRoutingService.route', () => {
	it('sends an undo to the document when nothing was typed in the field', () => {
		const service = new UndoRoutingService();

		service.focus(field);

		expect(service.route(field, 'undo', 'Tree')).toBe('document');
		expect(service.route(undefined, 'undo', '')).toBe('document');
	});

	it('undoes the typing in the field until it is back where it started, then the document', () => {
		const service = new UndoRoutingService();

		typed(service, field, 'Tree');

		expect(service.route(field, 'undo', 'Trees')).toBe('field');
		service.settle(field, 'Tree');
		expect(service.route(field, 'undo', 'Tree')).toBe('document');
	});

	it('takes the value before the typing, not the one the field had when it took the focus', () => {
		const service = new UndoRoutingService();

		service.focus(field);
		service.beforeInput(field, '"Tree"', 'insertText');
		service.settle(field, '"Tree"');

		expect(service.route(field, 'undo', '"Tree"')).toBe('document');
	});

	it('ignores the undo and redo steps of the field itself', () => {
		const service = new UndoRoutingService();

		typed(service, field, 'a');
		service.route(field, 'undo', 'ab');
		service.beforeInput(field, 'ab', 'historyUndo');
		service.settle(field, 'a');

		expect(service.route(field, 'redo', 'a')).toBe('field');
	});

	it('redoes in the field what it undid, and otherwise in the document', () => {
		const service = new UndoRoutingService();

		typed(service, field, 'a');
		service.route(field, 'undo', 'ab');
		service.settle(field, 'a');

		expect(service.route(field, 'redo', 'a')).toBe('field');
		expect(service.route(field, 'redo', 'ab')).toBe('document');
	});

	it('forgets a field once it loses the focus, as its typing is then committed', () => {
		const service = new UndoRoutingService();

		typed(service, field, 'a');
		service.blur(field);
		service.focus(other);

		expect(service.route(field, 'undo', 'ab')).toBe('document');
		expect(service.route(other, 'undo', 'b')).toBe('document');
	});

	it('starts over after new typing that follows an undo', () => {
		const service = new UndoRoutingService();

		typed(service, field, 'a');
		service.route(field, 'undo', 'ab');
		service.beforeInput(field, 'a', 'insertText');

		expect(service.route(field, 'redo', 'ac')).toBe('document');
	});
});

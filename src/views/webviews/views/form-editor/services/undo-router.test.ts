import { describe, expect, it } from 'vitest';
import { UndoRouter } from './undo-router';

const field = {};
const other = {};

/**
 * Focus a field and type into it once, changing its value from the given text.
 */
function typed(router: UndoRouter, target: object, before: string): void {
	router.focus(target);
	router.beforeInput(target, before, 'insertText');
}

describe('UndoRouter', () => {
	it('sends an undo to the document when nothing was typed in the field', () => {
		const router = new UndoRouter();

		router.focus(field);

		expect(router.route(field, 'undo', 'Tree')).toBe('document');
		expect(router.route(undefined, 'undo', '')).toBe('document');
	});

	it('undoes the typing in the field until it is back where it started, then the document', () => {
		const router = new UndoRouter();

		typed(router, field, 'Tree');

		expect(router.route(field, 'undo', 'Trees')).toBe('field');
		router.settle(field, 'Tree');
		expect(router.route(field, 'undo', 'Tree')).toBe('document');
	});

	it('takes the value before the typing, not the one the field had when it took the focus', () => {
		const router = new UndoRouter();

		router.focus(field);
		router.beforeInput(field, '"Tree"', 'insertText');
		router.settle(field, '"Tree"');

		expect(router.route(field, 'undo', '"Tree"')).toBe('document');
	});

	it('ignores the undo and redo steps of the field itself', () => {
		const router = new UndoRouter();

		typed(router, field, 'a');
		router.route(field, 'undo', 'ab');
		router.beforeInput(field, 'ab', 'historyUndo');
		router.settle(field, 'a');

		expect(router.route(field, 'redo', 'a')).toBe('field');
	});

	it('redoes in the field what it undid, and otherwise in the document', () => {
		const router = new UndoRouter();

		typed(router, field, 'a');
		router.route(field, 'undo', 'ab');
		router.settle(field, 'a');

		expect(router.route(field, 'redo', 'a')).toBe('field');
		expect(router.route(field, 'redo', 'ab')).toBe('document');
	});

	it('forgets a field once it loses the focus, as its typing is then committed', () => {
		const router = new UndoRouter();

		typed(router, field, 'a');
		router.blur(field);
		router.focus(other);

		expect(router.route(field, 'undo', 'ab')).toBe('document');
		expect(router.route(other, 'undo', 'b')).toBe('document');
	});

	it('starts over after new typing that follows an undo', () => {
		const router = new UndoRouter();

		typed(router, field, 'a');
		router.route(field, 'undo', 'ab');
		router.beforeInput(field, 'a', 'insertText');

		expect(router.route(field, 'redo', 'ac')).toBe('document');
	});
});

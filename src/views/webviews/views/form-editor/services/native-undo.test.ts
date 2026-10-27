import { describe, expect, it } from 'vitest';
import { UndoKeyLike, undoCommandOf } from './native-undo';

/**
 * Make a key event.
 */
function key(value: string, modifiers: Partial<Omit<UndoKeyLike, 'key'>> = {}): UndoKeyLike {
	return { key: value, ctrlKey: false, metaKey: false, shiftKey: false, ...modifiers };
}

describe('undoCommandOf', () => {
	it('reads undo and redo from Ctrl or Cmd with Z and Y', () => {
		expect(undoCommandOf(key('z', { ctrlKey: true }))).toBe('undo');
		expect(undoCommandOf(key('Z', { metaKey: true, shiftKey: true }))).toBe('redo');
		expect(undoCommandOf(key('y', { ctrlKey: true }))).toBe('redo');
	});

	it('ignores other keys and keys without the modifier', () => {
		expect(undoCommandOf(key('z'))).toBeUndefined();
		expect(undoCommandOf(key('x', { ctrlKey: true }))).toBeUndefined();
	});
});

import { describe, expect, it } from 'vitest';
import { KeyboardShortcut, ShortcutKeyEvent } from './keyboard-shortcut';

/**
 * A key event of the key given, with no modifier held unless given.
 * @param key The key.
 * @param modifiers The modifiers held.
 * @returns The event.
 */
function keyOf(key: string, modifiers: Partial<ShortcutKeyEvent> = {}): ShortcutKeyEvent {
	return { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers };
}

describe('KeyboardShortcut', () => {
	it('takes Ctrl and exactly the modifiers it asks for off macOS, in either case of the key', () => {
		const shortcut = new KeyboardShortcut('k', { shift: true }, false);

		expect(shortcut.matches(keyOf('K', { ctrlKey: true, shiftKey: true }))).toBe(true);
		expect(shortcut.matches(keyOf('k', { ctrlKey: true, shiftKey: true }))).toBe(true);
		expect(shortcut.matches(keyOf('k', { ctrlKey: true }))).toBe(false);
		expect(shortcut.matches(keyOf('k', { ctrlKey: true, shiftKey: true, altKey: true }))).toBe(false);
		expect(shortcut.matches(keyOf('k', { metaKey: true, shiftKey: true }))).toBe(false);
		expect(shortcut.matches(keyOf('j', { ctrlKey: true, shiftKey: true }))).toBe(false);
	});

	it('takes Cmd for Ctrl on macOS', () => {
		const shortcut = new KeyboardShortcut('f', {}, true);

		expect(shortcut.matches(keyOf('f', { metaKey: true }))).toBe(true);
		expect(shortcut.matches(keyOf('f', { ctrlKey: true }))).toBe(false);
	});

	it('writes the shortcut as VS Code writes it on each platform', () => {
		expect(new KeyboardShortcut('k', { shift: true }, false).label).toBe('Ctrl+Shift+K');
		expect(new KeyboardShortcut('k', { shift: true, alt: true }, false).label).toBe('Ctrl+Shift+Alt+K');
		expect(new KeyboardShortcut('k', { shift: true }, true).label).toBe('⇧⌘K');
		expect(new KeyboardShortcut('k', { shift: true, alt: true }, true).label).toBe('⌥⇧⌘K');
	});
});

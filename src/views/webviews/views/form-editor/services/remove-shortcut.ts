/**
 * A key event as the shortcut reads it.
 */
interface ShortcutKey {
	/**
	 * The key pressed.
	 */
	key: string;

	/**
	 * Whether Ctrl is held.
	 */
	ctrlKey: boolean;

	/**
	 * Whether Cmd, or the Windows key, is held.
	 */
	metaKey: boolean;

	/**
	 * Whether Shift is held.
	 */
	shiftKey: boolean;

	/**
	 * Whether Alt, or Option, is held.
	 */
	altKey: boolean;
}

/**
 * Whether the webview runs on macOS, where the shortcuts of VS Code take Cmd for Ctrl.
 */
const IS_MAC = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

/**
 * The shortcut of Remove in the menus of the form, as VS Code deletes a line: Ctrl+Shift+K, or
 * Cmd+Shift+K on macOS. It removes the row the focus is in, a nested card whose header has the
 * focus, or the card whose title bar, label row or footer has it.
 */
export const RemoveShortcut = {
	/**
	 * The shortcut as a menu shows it.
	 */
	label: IS_MAC ? '⇧⌘K' : 'Ctrl+Shift+K',

	/**
	 * Indicate whether a key event is the shortcut.
	 * @param event The key event.
	 * @returns `true` for Ctrl+Shift+K, or Cmd+Shift+K on macOS.
	 */
	matches(event: ShortcutKey): boolean {
		return event.key.toLowerCase() === 'k' && event.shiftKey && !event.altKey && (IS_MAC ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey);
	}
};

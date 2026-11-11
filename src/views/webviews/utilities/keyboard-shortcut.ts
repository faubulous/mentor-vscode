/**
 * A key event as a shortcut reads it.
 */
export type ShortcutKeyEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/**
 * The modifiers a shortcut takes besides Ctrl, or Cmd on macOS.
 */
export interface KeyboardShortcutModifiers {
	/**
	 * Whether Shift is held.
	 */
	shift?: boolean;

	/**
	 * Whether Alt, or Option, is held.
	 */
	alt?: boolean;
}

/**
 * Whether the webview runs on macOS, where the shortcuts of VS Code take Cmd for Ctrl.
 */
const IS_MAC = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

/**
 * A keyboard shortcut of a webview, held as VS Code holds its own: Ctrl with a key, or Cmd on
 * macOS, and Shift or Alt where the shortcut asks for them. It tells a key event that is the
 * shortcut, and writes the shortcut as a menu shows it.
 */
export class KeyboardShortcut {
	/**
	 * The shortcut as a menu shows it, such as `Ctrl+Shift+K`, or `⇧⌘K` on macOS.
	 */
	readonly label: string;

	/**
	 * Create a shortcut.
	 * @param key The key, in lower case.
	 * @param modifiers The modifiers it takes besides Ctrl, or Cmd on macOS.
	 * @param onMac Whether the shortcut is held as on macOS; the platform of the webview by default.
	 */
	constructor(
		private readonly _key: string,
		private readonly _modifiers: KeyboardShortcutModifiers = {},
		private readonly _onMac: boolean = IS_MAC
	) {
		this.label = this._labelOf();
	}

	/**
	 * Indicate whether a key event is the shortcut.
	 * @param event The key event.
	 * @returns `true` when the key and exactly the modifiers of the shortcut are pressed.
	 */
	matches(event: ShortcutKeyEvent): boolean {
		const primary = this._onMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;

		return primary
			&& event.key.toLowerCase() === this._key
			&& event.shiftKey === (this._modifiers.shift ?? false)
			&& event.altKey === (this._modifiers.alt ?? false);
	}

	/**
	 * Write the shortcut in the order VS Code writes it on the platform.
	 * @returns The label.
	 */
	private _labelOf(): string {
		const key = this._key.toUpperCase();
		const { shift = false, alt = false } = this._modifiers;

		if (this._onMac) {
			return `${alt ? '⌥' : ''}${shift ? '⇧' : ''}⌘${key}`;
		}

		return ['Ctrl', ...(shift ? ['Shift'] : []), ...(alt ? ['Alt'] : []), key].join('+');
	}
}

/**
 * The parts of a key event that tell an undo or redo.
 */
export interface UndoKeyLike {
	/**
	 * The key pressed.
	 */
	key: string;

	/**
	 * Whether Ctrl was held.
	 */
	ctrlKey: boolean;

	/**
	 * Whether Cmd was held.
	 */
	metaKey: boolean;

	/**
	 * Whether Shift was held.
	 */
	shiftKey: boolean;
}

/**
 * Tell whether a key asks to undo or redo, as Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y do.
 * @param event The key event.
 * @returns The command the key asks for, or `undefined` for any other key.
 */
export function undoCommandOf(event: UndoKeyLike): 'undo' | 'redo' | undefined {
	if (!(event.ctrlKey || event.metaKey)) {
		return undefined;
	}

	const key = event.key.toLowerCase();

	if (key === 'z') {
		return event.shiftKey ? 'redo' : 'undo';
	}

	return key === 'y' ? 'redo' : undefined;
}

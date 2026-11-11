import { KeyboardShortcut } from '@src/views/webviews/utilities/keyboard-shortcut';

/**
 * The keyboard shortcuts of the form editor.
 */
export const FormEditorShortcuts = {
	/**
	 * Remove, as VS Code deletes a line: removes the row the focus is in, a nested card whose
	 * header has the focus, or the card whose title bar, label row or footer has it.
	 */
	Remove: new KeyboardShortcut('k', { shift: true }),

	/**
	 * Find: opens the find of the form.
	 */
	Find: new KeyboardShortcut('f')
};

/**
 * Where an undo or redo goes: to the field the user is typing in, as a text editor undoes its
 * own typing, or to the document, as VS Code undoes the edits the form made.
 */
export type UndoTarget = 'field' | 'document';

/**
 * The command a key asks for.
 */
export type UndoCommand = 'undo' | 'redo';

/**
 * The parts of a keyboard event that tell an undo or redo, shared by the DOM and React events.
 */
export type UndoKeyboardEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'>;

/**
 * What the service remembers of the field that has the focus.
 */
interface FieldHistory {
	/**
	 * The value the field had before the user started typing in it.
	 */
	initial: string;

	/**
	 * Whether the user typed into the field since it took the focus.
	 */
	typed: boolean;

	/**
	 * How many of those typing steps were undone, which the field can redo.
	 */
	undone: number;
}

/**
 * Decides where Ctrl+Z and its redo go while the form has the focus. The browser keeps one undo
 * stack for the whole page, so asking it whether a field can undo answers for every field ever
 * typed in; the service instead follows the field that has the focus. Typing in it since it took
 * the focus is undone in the field, step by step, until the field is back at the value it had
 * before the typing; any further undo, and an undo in a field nobody typed in, goes to the
 * document. The value before the typing is taken as the typing starts, not as the field takes
 * the focus, because the form may still change the value then, as a literal gains its quotes.
 */
export class UndoRoutingService {
	private readonly _fields = new WeakMap<object, FieldHistory>();

	/**
	 * Tell whether a key asks to undo or redo, as Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y do.
	 * @param event The key event.
	 * @returns The command the key asks for, or `undefined` for any other key.
	 */
	static commandOf(event: UndoKeyboardEvent): UndoCommand | undefined {
		if (!(event.ctrlKey || event.metaKey)) {
			return undefined;
		}

		const key = event.key.toLowerCase();

		if (key === 'z') {
			return event.shiftKey ? 'redo' : 'undo';
		}

		return key === 'y' ? 'redo' : undefined;
	}

	/**
	 * A field took the focus.
	 * @param field The field.
	 */
	focus(field: object): void {
		this._fields.set(field, { initial: '', typed: false, undone: 0 });
	}

	/**
	 * The user is about to change a field, by typing, deleting or pasting. An undo or redo of the
	 * field itself is no such change.
	 * @param field The field.
	 * @param value Its value before the change.
	 * @param inputType The kind of change, as the `beforeinput` event names it.
	 */
	beforeInput(field: object, value: string, inputType: string): void {
		const history = this._fields.get(field);

		if (!history || inputType.startsWith('history')) {
			return;
		}

		if (!history.typed) {
			history.initial = value;
			history.typed = true;
		}

		history.undone = 0;
	}

	/**
	 * A field lost the focus: what was typed in it is the row's to commit, and undone in the
	 * document.
	 * @param field The field.
	 */
	blur(field: object): void {
		this._fields.delete(field);
	}

	/**
	 * Decide where an undo or redo pressed in a field goes, and note it when the field takes it.
	 * @param field The field that has the focus, if any.
	 * @param command The command.
	 * @param value The value of the field now.
	 * @returns Where the command goes.
	 */
	route(field: object | undefined, command: UndoCommand, value: string): UndoTarget {
		const history = field ? this._fields.get(field) : undefined;

		if (!history) {
			return 'document';
		}

		if (command === 'undo' && history.typed && value !== history.initial) {
			history.undone++;
			return 'field';
		}

		if (command === 'redo' && history.undone > 0) {
			history.undone--;
			return 'field';
		}

		return 'document';
	}

	/**
	 * Note the value of a field after it undid or redid a step, so the field counts as untouched
	 * again once it is back at the value it started with.
	 * @param field The field.
	 * @param value Its value now.
	 */
	settle(field: object, value: string): void {
		const history = this._fields.get(field);

		if (history) {
			history.typed = value !== history.initial;
		}
	}
}

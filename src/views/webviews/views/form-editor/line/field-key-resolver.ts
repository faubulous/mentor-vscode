import { FieldKeyAction } from './field-key-action';
import { FieldInputKind, FieldKeyContext } from './field-key-context';
import { FieldKeyboardEvent } from './field-keyboard-event';

/**
 * The kinds of input that hold one of the values of the statement, each on a row of its own.
 */
const VALUE_INPUTS: ReadonlySet<FieldInputKind> = new Set<FieldInputKind>(['resourcePill', 'literalText', 'literalTag', 'resourceText', 'source', 'nestedNodeCard']);

/**
 * Resolves a key pressed in a field of a statement row into the action it asks for: the popup
 * first, then the row-wide keys, then the keys of the field.
 */
export class FieldKeyResolver {
	/**
	 * Resolve a key.
	 * @param event The key event.
	 * @param context The field that received the key.
	 * @returns The action, or `undefined` when the key falls through to the field.
	 */
	resolve(event: FieldKeyboardEvent, context: FieldKeyContext): FieldKeyAction | undefined {
		if (event.isComposing || event.key === 'Process') {
			return undefined;
		}

		const modifier = event.ctrlKey || event.metaKey;

		if (modifier && event.key === ' ') {
			return { kind: 'popupOpen' };
		}

		if (context.popupOpen) {
			const popup = this._resolvePopupKey(event);

			if (popup) {
				return popup;
			}
		}

		if ((event.key === '.' && modifier) || (event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu') {
			return { kind: 'openMenu' };
		}

		if (event.altKey && !modifier && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
			const direction = event.key === 'ArrowUp' ? 'up' : 'down';

			return VALUE_INPUTS.has(context.field) ? { kind: 'moveValue', direction } : { kind: 'moveLine', direction };
		}

		if (modifier && event.shiftKey && event.key.toLowerCase() === 'k') {
			return this._resolveDeleteRow(context);
		}

		if (modifier || event.altKey) {
			return undefined;
		}

		return this._resolveRowKey(event, context) ?? this._resolveCaretKey(event, context) ?? this._resolveTypedKey(event, context);
	}

	/**
	 * Resolve the keys the open popup takes: arrows move, Enter and Tab accept, Escape closes.
	 * @param event The key event.
	 * @returns The action, or `undefined` for a key the popup does not take.
	 */
	private _resolvePopupKey(event: FieldKeyboardEvent): FieldKeyAction | undefined {
		switch (event.key) {
			case 'ArrowDown':
				return { kind: 'popupMove', delta: 1 };
			case 'ArrowUp':
				return { kind: 'popupMove', delta: -1 };
			case 'Enter':
			case 'Tab':
				return { kind: 'popupAccept' };
			case 'Escape':
				return { kind: 'popupClose' };
			default:
				return undefined;
		}
	}

	/**
	 * Resolve Ctrl+Shift+K, which deletes the row the caret is on, as in the text editor: the
	 * value of a value field, or the whole statement from its predicate.
	 * @param context The field.
	 * @returns The action, or `undefined` in the field for a new value.
	 */
	private _resolveDeleteRow(context: FieldKeyContext): FieldKeyAction | undefined {
		if (VALUE_INPUTS.has(context.field)) {
			return { kind: 'removeField' };
		}

		return context.field === 'predicate' ? { kind: 'deleteLine' } : undefined;
	}

	/**
	 * Resolve the keys that act on the row: Enter, Tab, Escape and the vertical arrows.
	 * @param event The key event.
	 * @param context The field.
	 * @returns The action, or `undefined` for other keys.
	 */
	private _resolveRowKey(event: FieldKeyboardEvent, context: FieldKeyContext): FieldKeyAction | undefined {
		switch (event.key) {
			case 'Enter':
				return this._resolveEnter(event, context);
			case 'F2':
				return context.field === 'resourcePill' ? { kind: 'editPill' } : undefined;
			case 'Tab':
				return { kind: event.shiftKey ? 'previousField' : 'nextField' };
			case 'Escape':
				return { kind: 'leave' };
			case 'ArrowUp':
				return context.onFirstLine ? { kind: 'lineUp' } : undefined;
			case 'ArrowDown':
				return context.onLastLine ? { kind: 'lineDown' } : undefined;
			default:
				return undefined;
		}
	}

	/**
	 * Resolve Enter, which adds a value below the values of the statement. In the empty field
	 * for a new value it ends the values and opens a statement below, as an empty item ends a
	 * list; in a literal Shift+Enter breaks the line instead.
	 * @param event The key event.
	 * @param context The field.
	 * @returns The action, or `undefined` for a line break.
	 */
	private _resolveEnter(event: FieldKeyboardEvent, context: FieldKeyContext): FieldKeyAction | undefined {
		switch (context.field) {
			case 'predicate':
				return context.rowEmpty ? { kind: 'newLine' } : { kind: 'nextField' };
			case 'newValue':
				return context.empty ? { kind: 'newLine' } : { kind: 'commitField' };
			case 'literalText':
				return event.shiftKey ? undefined : { kind: 'addValue' };
			default:
				return { kind: 'addValue' };
		}
	}

	/**
	 * Resolve the keys that cross from one field to the next or delete across them.
	 * @param event The key event.
	 * @param context The field.
	 * @returns The action, or `undefined` for a key that stays in the field.
	 */
	private _resolveCaretKey(event: FieldKeyboardEvent, context: FieldKeyContext): FieldKeyAction | undefined {
		// A pill and the card of a nested node are one thing each, which the arrows cross at once.
		const whole = context.field === 'resourcePill' || context.field === 'nestedNodeCard';

		switch (event.key) {
			case 'Home':
				return (whole || context.atStart) && !event.shiftKey ? { kind: 'rowStart' } : undefined;
			case 'End':
				return (whole || context.atEnd) && !event.shiftKey ? { kind: 'rowEnd' } : undefined;
			case 'ArrowLeft':
				return (whole || context.atStart) && !event.shiftKey ? { kind: 'previousField' } : undefined;
			case 'ArrowRight':
				return (whole || context.atEnd) && !event.shiftKey ? { kind: 'nextField' } : undefined;
			case 'Backspace':
				return this._resolveBackspace(context);
			case 'Delete':
				return whole ? { kind: 'removeField', forward: true } : undefined;
			default:
				return undefined;
		}
	}

	/**
	 * Resolve Backspace: a pill or the card of a nested node goes whole, an emptied value goes,
	 * an emptied tag leaves its literal, the start of the new value takes the value before it,
	 * and an empty row goes.
	 * @param context The field.
	 * @returns The action, or `undefined` when Backspace deletes a character.
	 */
	private _resolveBackspace(context: FieldKeyContext): FieldKeyAction | undefined {
		if (context.field === 'resourcePill' || context.field === 'nestedNodeCard') {
			return { kind: 'removeField' };
		}

		if (!context.empty || !context.atStart) {
			return undefined;
		}

		switch (context.field) {
			case 'predicate':
				return context.rowEmpty ? { kind: 'deleteLine' } : undefined;
			case 'newValue':
				return { kind: 'removePrevious' };
			case 'literalTag':
				return { kind: 'removeSuffix' };
			case 'literalText':
			case 'resourceText':
			case 'source':
				return { kind: 'removeField' };
			default:
				return undefined;
		}
	}

	/**
	 * Resolve the characters that mean more than themselves in a field.
	 * @param event The key event.
	 * @param context The field.
	 * @returns The action, or `undefined` for a character that is typed.
	 */
	private _resolveTypedKey(event: FieldKeyboardEvent, context: FieldKeyContext): FieldKeyAction | undefined {
		if (event.key.length !== 1) {
			return undefined;
		}

		switch (context.field) {
			case 'resourcePill':
				return { kind: 'editPill', seed: event.key };
			case 'predicate':
				return event.key === ' ' && context.atEnd && !context.empty ? { kind: 'nextField' } : undefined;
			case 'literalText':
				return this._resolveSuffixStart(event.key, context);
			case 'newValue':
				return this._resolveNewValueKey(event.key, context);
			case 'resourceText':
				return this._resolveSeparator(event.key, context);
			default:
				return undefined;
		}
	}

	/**
	 * Resolve a character typed into the field for a new value: a quote starts a literal, `@`
	 * after a text starts its language tag, and a separator confirms a resource.
	 * @param key The character.
	 * @param context The field.
	 * @returns The action, or `undefined` for a character that is typed.
	 */
	private _resolveNewValueKey(key: string, context: FieldKeyContext): FieldKeyAction | undefined {
		if (key === '"' && context.empty) {
			return { kind: 'startLiteral' };
		}

		if (key === '@' && context.atEnd && !context.empty && !context.looksLikeName) {
			return { kind: 'startSuffix', marker: '@' };
		}

		return this._resolveSeparator(key, context);
	}

	/**
	 * `@` at the end of the text of a literal starts its language tag, and a second `^` its
	 * datatype, in the field after the text; a literal that has one already keeps it.
	 * @param key The character.
	 * @param context The field.
	 * @returns The action, or `undefined` for a character that is typed.
	 */
	private _resolveSuffixStart(key: string, context: FieldKeyContext): FieldKeyAction | undefined {
		if (!context.atEnd || context.empty || context.hasSuffix) {
			return undefined;
		}

		if (key === '@') {
			return { kind: 'startSuffix', marker: '@' };
		}

		return key === '^' && context.previousCharacter === '^' ? { kind: 'startSuffix', marker: '^^' } : undefined;
	}

	/**
	 * Space or comma at the end of a typed resource confirms it.
	 * @param key The character.
	 * @param context The field.
	 * @returns The action, or `undefined` for a character that is typed.
	 */
	private _resolveSeparator(key: string, context: FieldKeyContext): FieldKeyAction | undefined {
		return (key === ' ' || key === ',') && context.atEnd && !context.empty ? { kind: 'commitField' } : undefined;
	}
}

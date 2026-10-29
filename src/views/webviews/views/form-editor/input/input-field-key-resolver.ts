import { InputFieldKeyAction } from './input-field-key-action';
import { InputFieldInputKind, InputFieldKeyContext } from './input-field-key-context';
import { InputFieldKeyboardEvent } from './input-field-keyboard-event';

/**
 * The kinds of input that hold one of the values of the statement, each on a row of its own.
 */
const VALUE_INPUTS: ReadonlySet<InputFieldInputKind> = new Set<InputFieldInputKind>(['resourcePill', 'literalText', 'literalTag', 'source']);

/**
 * Resolves a key pressed in a field of a statement row into the action it asks for: the keys of
 * the row first, then the keys that cross from field to field, then the characters that mean
 * more than themselves. Keys the library handles itself fall through.
 */
export class InputFieldKeyResolver {
	/**
	 * Resolve a key.
	 * @param event The key event.
	 * @param context The field that received the key.
	 * @returns The action, or `undefined` when the key falls through to the field.
	 */
	resolve(event: InputFieldKeyboardEvent, context: InputFieldKeyContext): InputFieldKeyAction | undefined {
		if (event.isComposing || event.key === 'Process') {
			return undefined;
		}

		const modifier = event.ctrlKey || event.metaKey;

		if (modifier && event.shiftKey && event.key.toLowerCase() === 'k') {
			return this._resolveDeleteRow(context);
		}

		if (modifier || event.altKey) {
			return undefined;
		}

		return this._resolveRowKey(event, context) ?? this._resolveCaretKey(event, context) ?? this._resolveTypedKey(event, context);
	}

	/**
	 * Resolve Ctrl+Shift+K, which deletes the row the caret is on, as in the text editor: the
	 * value of a value field, or the whole statement from its predicate.
	 * @param context The field.
	 * @returns The action, or `undefined` in the field for a new value.
	 */
	private _resolveDeleteRow(context: InputFieldKeyContext): InputFieldKeyAction | undefined {
		if (VALUE_INPUTS.has(context.field)) {
			return { kind: 'removeField' };
		}

		return context.field === 'predicate' ? { kind: 'deleteRow' } : undefined;
	}

	/**
	 * Resolve the keys that act on the row: Enter, Tab, Escape and the vertical arrows.
	 * @param event The key event.
	 * @param context The field.
	 * @returns The action, or `undefined` for other keys.
	 */
	private _resolveRowKey(event: InputFieldKeyboardEvent, context: InputFieldKeyContext): InputFieldKeyAction | undefined {
		switch (event.key) {
			case 'Enter':
				return this._resolveEnter(event, context);
			case 'Tab':
				return { kind: event.shiftKey ? 'previousField' : 'nextField', stops: true };
			case 'Escape':
				return { kind: 'restore' };
			case 'ArrowUp':
				return context.onFirstLine ? { kind: 'rowUp' } : undefined;
			case 'ArrowDown':
				return context.onLastLine ? { kind: 'rowDown' } : undefined;
			default:
				return undefined;
		}
	}

	/**
	 * Resolve Enter: in a literal it writes the row (Shift+Enter breaks the line); in the input
	 * of a resource row it confirms what was typed, or, empty, ends the row and moves to the one
	 * below; on a pill it opens the input; in the predicate it moves on.
	 * @param event The key event.
	 * @param context The field.
	 * @returns The action, or `undefined` for a line break.
	 */
	private _resolveEnter(event: InputFieldKeyboardEvent, context: InputFieldKeyContext): InputFieldKeyAction | undefined {
		switch (context.field) {
			case 'predicate':
				return context.rowEmpty ? { kind: 'nextRow' } : { kind: 'nextField', stops: true };
			case 'newValue':
				return context.empty ? { kind: 'nextRow' } : { kind: 'commitField' };
			case 'literalText':
				return event.shiftKey ? undefined : { kind: 'saveRow' };
			case 'literalTag':
				return { kind: 'pickTag' };
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
	private _resolveCaretKey(event: InputFieldKeyboardEvent, context: InputFieldKeyContext): InputFieldKeyAction | undefined {
		// A pill is one thing, which the arrows cross at once.
		const whole = context.field === 'resourcePill';

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
	 * Resolve Backspace: a pill goes whole, an emptied value goes, an emptied tag leaves its
	 * literal, the start of the new value takes the value before it, and an empty row goes.
	 * @param context The field.
	 * @returns The action, or `undefined` when Backspace deletes a character.
	 */
	private _resolveBackspace(context: InputFieldKeyContext): InputFieldKeyAction | undefined {
		if (context.field === 'resourcePill') {
			return { kind: 'removeField' };
		}

		if (!context.empty || !context.atStart) {
			return undefined;
		}

		switch (context.field) {
			case 'predicate':
				return context.rowEmpty ? { kind: 'deleteRow' } : undefined;
			case 'newValue':
				return { kind: 'removePrevious' };
			case 'literalTag':
				return { kind: 'removeSuffix' };
			case 'literalText':
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
	private _resolveTypedKey(event: InputFieldKeyboardEvent, context: InputFieldKeyContext): InputFieldKeyAction | undefined {
		if (event.key.length !== 1) {
			return undefined;
		}

		switch (context.field) {
			case 'resourcePill':
				return { kind: 'typeIntoInput', seed: event.key };
			case 'predicate':
				return event.key === ' ' && context.atEnd && !context.empty ? { kind: 'nextField' } : undefined;
			case 'literalText':
				return this._resolveSuffixStart(event.key, context);
			case 'newValue':
				return this._resolveNewValueKey(event.key, context);
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
	private _resolveNewValueKey(key: string, context: InputFieldKeyContext): InputFieldKeyAction | undefined {
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
	private _resolveSuffixStart(key: string, context: InputFieldKeyContext): InputFieldKeyAction | undefined {
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
	private _resolveSeparator(key: string, context: InputFieldKeyContext): InputFieldKeyAction | undefined {
		return (key === ' ' || key === ',') && context.atEnd && !context.empty ? { kind: 'commitField' } : undefined;
	}
}

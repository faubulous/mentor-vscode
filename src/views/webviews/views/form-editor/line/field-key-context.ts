/**
 * The kinds of input a statement row is edited in: its predicate, a resource being typed, the
 * text of a literal, the language tag or datatype of a literal, a confirmed resource shown as a
 * pill, a value edited as source, the card of a nested blank node, and the field for a new value.
 */
export type FieldInputKind = 'predicate' | 'resourceText' | 'literalText' | 'literalTag' | 'resourcePill' | 'source' | 'nestedNodeCard' | 'newValue';

/**
 * What the key resolver needs to know about the field that received a key.
 */
export interface FieldKeyContext {
	/**
	 * The kind of input the key was pressed in.
	 */
	field: FieldInputKind;

	/**
	 * Whether the completion popup shows items.
	 */
	popupOpen: boolean;

	/**
	 * Whether the field is empty.
	 */
	empty: boolean;

	/**
	 * Whether the selection is collapsed at the start of the field.
	 */
	atStart: boolean;

	/**
	 * Whether the selection is collapsed at the end of the field.
	 */
	atEnd: boolean;

	/**
	 * Whether the caret is on the first line of a multi-line field.
	 */
	onFirstLine: boolean;

	/**
	 * Whether the caret is on the last line of a multi-line field.
	 */
	onLastLine: boolean;

	/**
	 * Whether the whole row is empty: no predicate and no values.
	 */
	rowEmpty: boolean;

	/**
	 * Whether the typed text reads as the name of a resource, which a language tag cannot follow.
	 */
	looksLikeName?: boolean;

	/**
	 * The character before the caret, which `^` completes into `^^`.
	 */
	previousCharacter?: string;

	/**
	 * Whether the literal of the field has a language tag or datatype already.
	 */
	hasSuffix?: boolean;
}

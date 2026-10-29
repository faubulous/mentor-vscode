/**
 * The kinds of input a statement row is edited in: its predicate, the text of a literal, the
 * button of its language tag or datatype, a resource shown as a pill, a value edited as source,
 * and the input a new value is typed into.
 */
export type InputFieldInputKind = 'predicate' | 'literalText' | 'literalTag' | 'resourcePill' | 'source' | 'newValue';

/**
 * What the key resolver needs to know about the field that received a key.
 */
export interface InputFieldKeyContext {
	/**
	 * The kind of input the key was pressed in.
	 */
	field: InputFieldInputKind;

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
	 * Whether the whole row is empty: no predicate, no values and nothing typed.
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

/**
 * One value of a statement row, edited in a field of its own: a resource shown as a pill, a
 * literal with its language tag or datatype, a number or boolean written without quotes, a `[]`
 * typed to add a nested blank node, or anything else, such as a list, edited as its Turtle source.
 */
export type ValueField =
	| { kind: 'resource'; text: string }
	/**
	 * `value` is the text itself, without escapes; `suffix` is `@language`, `^^datatype` or empty.
	 * `source` holds what was typed while it does not read as a quoted literal, such as a text
	 * whose closing quote was deleted; it is read again when the row is written.
	 */
	| { kind: 'literal'; value: string; suffix: string; source?: string }
	| { kind: 'shorthandLiteral'; text: string }
	| { kind: 'nestedNode' }
	| { kind: 'source'; text: string };

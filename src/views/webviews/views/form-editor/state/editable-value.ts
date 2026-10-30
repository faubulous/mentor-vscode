/**
 * One value of a statement as it is edited in a field of its own: a resource shown as a pill, a
 * literal with its language tag or datatype, a number or boolean written without quotes, a
 * blank node shown as a nested card, or anything else, such as a list, edited as its Turtle
 * source.
 */
export type EditableValue =
	| { kind: 'resource'; text: string }
	/**
	 * `value` is the text itself, without escapes; `suffix` is `@language`, `^^datatype` or empty.
	 */
	| { kind: 'literal'; value: string; suffix: string }
	| { kind: 'shorthandLiteral'; text: string }
	| { kind: 'nestedNode' }
	| { kind: 'source'; text: string };

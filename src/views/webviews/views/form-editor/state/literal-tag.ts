/**
 * The tag of a literal: its language, or its datatype, or neither for plain text.
 */
export interface LiteralTag {
	/**
	 * The language tag.
	 */
	language?: string;

	/**
	 * The IRI of the datatype.
	 */
	datatype?: string;
}

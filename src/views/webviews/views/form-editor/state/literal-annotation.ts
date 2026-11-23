/**
 * The annotation of a literal: its language tag, or its datatype, or neither for plain text.
 */
export interface LiteralAnnotation {
	/**
	 * The language tag.
	 */
	language?: string;

	/**
	 * The IRI of the datatype.
	 */
	datatype?: string;
}

/**
 * A place where the text of a document does not follow the grammar of its syntax: a character the
 * lexer could not match, or a token the parser did not expect.
 */
export interface DocumentSyntaxError {
	/**
	 * What is wrong, as the lexer or the parser says.
	 */
	message: string;

	/**
	 * The offset in the text the error is at.
	 */
	offset: number;
}

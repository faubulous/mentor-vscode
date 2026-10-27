import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';

/**
 * Indicate whether a token carries no syntax of its own. Whitespace is not part of the token
 * stream, so comments are the only trivia.
 * @param token The token to inspect.
 */
export function isTriviaToken(token: IToken | undefined): boolean {
	return token?.tokenType?.name === RdfToken.COMMENT.name;
}

/**
 * Find the next token that is not trivia.
 * @param tokens The token stream.
 * @param index The index to start after.
 * @returns The index of the token, or `-1` if there is none.
 */
export function nextNonTriviaIndex(tokens: readonly IToken[], index: number): number {
	for (let i = index + 1; i < tokens.length; i++) {
		if (!isTriviaToken(tokens[i])) {
			return i;
		}
	}

	return -1;
}

/**
 * Find the previous token that is not trivia.
 * @param tokens The token stream.
 * @param index The index to start before.
 * @returns The index of the token, or `-1` if there is none.
 */
export function previousNonTriviaIndex(tokens: readonly IToken[], index: number): number {
	for (let i = index - 1; i >= 0; i--) {
		if (!isTriviaToken(tokens[i])) {
			return i;
		}
	}

	return -1;
}

/**
 * Get the exclusive end offset of a token.
 * @param token The token.
 */
export function tokenEnd(token: IToken): number {
	return (token.endOffset ?? token.startOffset + token.image.length - 1) + 1;
}

/**
 * Indicate whether a token is of one of the given types.
 * @param token The token to inspect.
 * @param names The token type names to accept.
 */
export function isTokenOfType(token: IToken | undefined, ...names: string[]): boolean {
	const name = token?.tokenType?.name;

	return name !== undefined && names.includes(name);
}

/**
 * Get the offset where the line holding an offset starts.
 * @param text The document text.
 * @param offset An offset within the line.
 */
export function lineStartOffset(text: string, offset: number): number {
	return text.lastIndexOf('\n', offset - 1) + 1;
}

/**
 * Get the offset of the line break ending the line holding an offset, or the text length.
 * @param text The document text.
 * @param offset An offset within the line.
 */
export function lineEndOffset(text: string, offset: number): number {
	const index = text.indexOf('\n', offset);

	if (index < 0) {
		return text.length;
	}

	return text[index - 1] === '\r' ? index - 1 : index;
}

/**
 * Get the offset just past the line break ending the line holding an offset.
 * @param text The document text.
 * @param offset An offset within the line.
 */
export function nextLineStartOffset(text: string, offset: number): number {
	const index = text.indexOf('\n', offset);

	return index < 0 ? text.length : index + 1;
}

/**
 * Indicate whether a range of the text holds nothing but spaces and tabs.
 * @param text The document text.
 * @param start The start of the range.
 * @param end The exclusive end of the range.
 */
export function isBlank(text: string, start: number, end: number): boolean {
	return /^[ \t\r]*$/.test(text.slice(start, end));
}

/**
 * Indicate whether a range holds nothing but white space, line breaks included. Unlike
 * {@link isBlank} this says whether two things are separated by empty lines rather than whether
 * they sit on the same one.
 * @param text The document text.
 * @param start The offset to start at.
 * @param end The offset to stop before.
 * @returns `true` if the range holds no content.
 */
export function isWhitespace(text: string, start: number, end: number): boolean {
	return /^\s*$/.test(text.slice(start, end));
}

/**
 * Get the indentation of the line holding an offset when the offset starts its line's content.
 * @param text The document text.
 * @param offset The offset of a token.
 * @returns The leading whitespace of the line, or `undefined` if other content precedes the offset.
 */
export function indentBefore(text: string, offset: number): string | undefined {
	const lineStart = lineStartOffset(text, offset);
	const prefix = text.slice(lineStart, offset);

	return /^[ \t]*$/.test(prefix) ? prefix : undefined;
}

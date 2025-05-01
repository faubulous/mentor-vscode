/**
 * Count the number of leading whitespace characters in a string.
 * @param str A string.
 * @returns The number of leading whitespace characters in the string.
 */
export function countLeadingWhitespace(str: string) {
	return str.length - str.trimStart().length;
}

/**
 * Count the number of trailing whitespace characters in a string.
 * @param str A string.
 * @returns The number of trailing whitespace characters in the string.
 */
export function countTrailingWhitespace(str: string) {
	return str.length - str.trimEnd().length;
}

/**
 * Find the first occurrence of a string in a text document and return its position.
 * @param document A text document.
 * @param text A string to search for in the document.
 * @returns The position of the string in the document or `undefined` if not found.
 */
export function findPosition(str: string, text: string): { line: number, character: number } | undefined {
	const index = str.indexOf(text);

	if (index === -1) {
		return undefined;
	}

	const beforeText = str.substring(0, index);
	const line = beforeText.split('\n').length - 1;
	const character = index - beforeText.lastIndexOf('\n') - 1;

	return { line, character };
}
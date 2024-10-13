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
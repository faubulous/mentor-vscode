/**
 * Generates a unique URL-safe slug from a display name: lowercased, runs of
 * non-alphanumeric characters collapsed to `-`, trimmed, falling back to
 * {@link fallback} for names without usable characters. On a collision with an
 * existing id, a numeric suffix (`-2`, `-3`, ...) is appended.
 * @param name The display name to derive the slug from.
 * @param existingIds Ids the slug must not collide with.
 * @param fallback The slug used when the name yields no usable characters.
 * @returns A slug unique among the existing ids.
 */
export function generateUniqueSlug(name: string, existingIds: readonly string[], fallback: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		|| fallback;

	const taken = new Set(existingIds);

	if (!taken.has(slug)) {
		return slug;
	}

	for (let suffix = 2; ; suffix++) {
		const candidate = `${slug}-${suffix}`;

		if (!taken.has(candidate)) {
			return candidate;
		}
	}
}

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
/**
 * Computes a fingerprint of a text: its length and a 53-bit hash of its characters (cyrb53).
 * Used to recognize a text again without keeping it in memory; two different texts of the
 * same length share a fingerprint with negligible probability.
 * @param text The text.
 * @returns The fingerprint.
 */
export function getTextFingerprint(text: string): string {
	let hash1 = 0xdeadbeef;
	let hash2 = 0x41c6ce57;

	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);

		hash1 = Math.imul(hash1 ^ code, 2654435761);
		hash2 = Math.imul(hash2 ^ code, 1597334677);
	}

	hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507);
	hash1 ^= Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
	hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507);
	hash2 ^= Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);

	const hash = 4294967296 * (2097151 & hash2) + (hash1 >>> 0);

	return `${text.length}:${hash.toString(36)}`;
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

/**
 * Turn a local name into words: camel case is split, underscores and dashes become spaces.
 * @param local The local name.
 * @param lower Whether to lower-case the result, as for property names.
 * @returns The words.
 */
export function humanize(local: string, lower: boolean): string {
	const words = local.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');

	return lower ? words.toLowerCase() : words;
}

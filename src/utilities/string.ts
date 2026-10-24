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

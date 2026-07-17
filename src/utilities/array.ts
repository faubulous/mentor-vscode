/**
 * Returns a stable unique array of non-empty string values: entries are
 * trimmed, non-strings and duplicates are dropped, and the input order is
 * preserved. Non-array inputs yield an empty array, making this safe for
 * unvalidated settings values.
 */
export function toUniqueStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const seen = new Set<string>();
	const result: string[] = [];

	for (const entry of value) {
		if (typeof entry !== 'string') {
			continue;
		}

		const trimmed = entry.trim();

		if (!trimmed || seen.has(trimmed)) {
			continue;
		}

		seen.add(trimmed);
		result.push(trimmed);
	}

	return result;
}

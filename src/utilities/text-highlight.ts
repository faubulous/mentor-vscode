/**
 * A run of text, marked when it matches a filter.
 */
export interface TextSegment {
	/**
	 * The text of the run.
	 */
	text: string;

	/**
	 * Whether the run matches the filter.
	 */
	match: boolean;
}

/**
 * Split a text into the runs that match a filter and those that do not, ignoring case.
 * @param text The text, such as a label or a description.
 * @param query The text typed into a filter field.
 * @returns The runs in order; the whole text unmarked when the filter is blank or does not match.
 */
export function highlightSegments(text: string, query: string): TextSegment[] {
	const needle = query.trim().toLowerCase();

	if (!needle) {
		return [{ text, match: false }];
	}

	const haystack = text.toLowerCase();
	const segments: TextSegment[] = [];
	let position = 0;

	for (let found = haystack.indexOf(needle); found >= 0; found = haystack.indexOf(needle, position)) {
		if (found > position) {
			segments.push({ text: text.slice(position, found), match: false });
		}

		segments.push({ text: text.slice(found, found + needle.length), match: true });
		position = found + needle.length;
	}

	if (position < text.length) {
		segments.push({ text: text.slice(position), match: false });
	}

	return segments;
}

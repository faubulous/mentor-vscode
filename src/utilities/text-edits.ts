/**
 * A replacement of one range of the document text, addressed by offsets into the text the edit
 * was synthesized against. `end` is exclusive; an insertion has `start === end`.
 */
export interface TextEditSpec {
	/**
	 * The offset the replaced range starts at.
	 */
	start: number;

	/**
	 * The offset the replaced range ends at, exclusive.
	 */
	end: number;

	/**
	 * The text that replaces the range.
	 */
	newText: string;
}

/**
 * Sort edits by position so they can be applied in one pass.
 * @param edits The edits to sort.
 * @returns A new array sorted by start and then by end offset.
 */
export function sortTextEdits(edits: readonly TextEditSpec[]): TextEditSpec[] {
	return [...edits].sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Find two edits that touch the same text. Two insertions at the same offset count as
 * overlapping because their order would be undefined.
 * @param edits The edits to inspect.
 * @returns The first overlapping pair, or `undefined` if the edits are disjoint.
 */
export function findOverlappingEdits(edits: readonly TextEditSpec[]): [TextEditSpec, TextEditSpec] | undefined {
	const sorted = sortTextEdits(edits);

	for (let i = 1; i < sorted.length; i++) {
		const previous = sorted[i - 1];
		const current = sorted[i];

		if (current.start < previous.end || current.start === previous.start) {
			return [previous, current];
		}
	}

	return undefined;
}

/**
 * Apply edits to a text.
 * @param text The text the edits were synthesized against.
 * @param edits The edits to apply.
 * @returns The edited text.
 * @throws When two edits overlap.
 */
export function applyTextEdits(text: string, edits: readonly TextEditSpec[]): string {
	const sorted = sortTextEdits(edits);

	if (findOverlappingEdits(sorted)) {
		throw new Error('Text edits overlap.');
	}

	let result = '';
	let cursor = 0;

	for (const edit of sorted) {
		result += text.slice(cursor, edit.start) + edit.newText;
		cursor = edit.end;
	}

	return result + text.slice(cursor);
}

/**
 * Translate an offset of the original text into the edited text.
 * @param offset The offset in the original text.
 * @param edits The edits that were applied.
 * @returns The offset in the edited text, or `undefined` if the edits removed that position.
 */
export function shiftOffset(offset: number, edits: readonly TextEditSpec[]): number | undefined {
	let shifted = offset;

	for (const edit of sortTextEdits(edits)) {
		if (edit.end <= offset) {
			shifted += edit.newText.length - (edit.end - edit.start);
		} else if (edit.start <= offset) {
			return undefined;
		} else {
			break;
		}
	}

	return shifted;
}

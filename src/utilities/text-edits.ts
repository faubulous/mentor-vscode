import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { isBlank, lineEndOffset, lineStartOffset, nextLineStartOffset } from '@src/utilities/string';
import { tokenEnd } from '@src/utilities/tokens';

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

/**
 * Delete a range of the document while keeping the comments written inside it. Each comment stays
 * on a line of its own: the text before it goes, and the deletion resumes on the next line.
 * @param text The document text.
 * @param tokens The token stream.
 * @param start The start of the range.
 * @param end The exclusive end of the range.
 * @returns The edits that remove everything but the comments.
 */
export function deleteRange(text: string, tokens: readonly IToken[], start: number, end: number): TextEditSpec[] {
	const comments = tokens.filter(
		token => token.tokenType?.name === RdfToken.COMMENT.name && token.startOffset >= start && tokenEnd(token) <= end
	);

	if (comments.length === 0) {
		return start < end ? [{ start, end, newText: '' }] : [];
	}

	const edits: TextEditSpec[] = [];
	let cursor = start;

	for (const comment of comments) {
		// Keep one space in front of the comment so it does not glue to the value before it,
		// unless the text before the deletion already ends in whitespace.
		const keepSpace = text[comment.startOffset - 1] === ' ' && !/\s/.test(text[cursor - 1] ?? ' ');
		const segmentEnd = keepSpace ? comment.startOffset - 1 : comment.startOffset;

		if (segmentEnd > cursor) {
			edits.push({ start: cursor, end: segmentEnd, newText: '' });
		}

		cursor = Math.min(end, nextLineStartOffset(text, tokenEnd(comment)));
	}

	// What follows the last comment is the indentation of the next value, which now leads its
	// line; it stays so the line keeps its place in the block.
	if (end > cursor && !isBlank(text, cursor, end)) {
		edits.push({ start: cursor, end, newText: '' });
	}

	return edits;
}

/**
 * Widen a deletion to the whole line when nothing but whitespace would remain on it, so a
 * removed statement does not leave a blank line behind.
 * @param text The document text.
 * @param start The start of the deletion.
 * @param end The exclusive end of the deletion.
 * @returns The widened range, or the original one when other content shares the line.
 */
export function expandToWholeLines(text: string, start: number, end: number): { start: number; end: number } {
	const lineStart = lineStartOffset(text, start);
	const lineEnd = lineEndOffset(text, end);

	if (!isBlank(text, lineStart, start) || !isBlank(text, end, lineEnd)) {
		return { start, end };
	}

	const nextLine = nextLineStartOffset(text, end);

	if (nextLine < text.length || lineStart === 0) {
		return { start: lineStart, end: nextLine };
	}

	// The last line of the file: take the line break before it instead of the missing one after.
	const breakLength = text[lineStart - 2] === '\r' ? 2 : 1;

	return { start: lineStart - breakLength, end: nextLine };
}

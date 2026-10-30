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
function _sortTextEdits(edits: readonly TextEditSpec[]): TextEditSpec[] {
	return [...edits].sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Find two edits that touch the same text. Two insertions at the same offset count as
 * overlapping because their order would be undefined.
 * @param edits The edits to inspect.
 * @returns The first overlapping pair, or `undefined` if the edits are disjoint.
 */
export function findOverlappingEdits(edits: readonly TextEditSpec[]): [TextEditSpec, TextEditSpec] | undefined {
	const sorted = _sortTextEdits(edits);

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
	const sorted = _sortTextEdits(edits);

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

	if (text.includes('\n', end) || lineStart === 0) {
		return { start: lineStart, end: nextLine };
	}

	// The last line of the file has no line break after it: take the one before it instead.
	const breakLength = text[lineStart - 2] === '\r' ? 2 : 1;

	return { start: lineStart - breakLength, end: nextLine };
}

/**
 * Take one blank line next to a removed block along, so two blocks do not end up separated by
 * two: the line after the block, or the line before it when the block ends the document.
 * @param text The document text.
 * @param range The whole lines being removed.
 * @returns The range widened by one blank line, or the range itself.
 */
export function absorbBlankLine(text: string, range: { start: number; end: number }): { start: number; end: number } {
	const lineEnd = lineEndOffset(text, range.end);

	if (range.end < text.length && isBlank(text, range.end, lineEnd) && lineEnd < text.length) {
		return { start: range.start, end: nextLineStartOffset(text, range.end) };
	}

	if (range.end >= text.length && range.start > 0) {
		const previousLineStart = lineStartOffset(text, range.start - 1);

		if (isBlank(text, previousLineStart, range.start - 1)) {
			return { start: previousLineStart, end: range.end };
		}
	}

	return range;
}

/**
 * Merge ranges that overlap or touch, as the removals of neighbouring blocks do.
 * @param ranges The ranges, in any order.
 * @returns The merged ranges in document order.
 */
export function mergeRanges(ranges: readonly { start: number; end: number }[]): { start: number; end: number }[] {
	const merged: { start: number; end: number }[] = [];

	for (const range of [...ranges].sort((first, second) => first.start - second.start)) {
		const last = merged[merged.length - 1];

		if (last && range.start <= last.end) {
			last.end = Math.max(last.end, range.end);
		} else {
			merged.push({ ...range });
		}
	}

	return merged;
}


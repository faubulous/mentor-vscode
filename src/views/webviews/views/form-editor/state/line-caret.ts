/**
 * Where the caret goes when a statement line receives the focus: an offset into its text, its
 * end, the text of its first quoted literal (selected), or the position before that literal's
 * closing quote.
 */
export type LineCaret = number | 'end' | 'label' | 'labelEnd';

/**
 * A selection within the text of a line.
 */
export interface LineSelection {
	/**
	 * The offset the selection starts at.
	 */
	start: number;

	/**
	 * The offset the selection ends at.
	 */
	end: number;
}

/**
 * The first quoted literal of a line, with its text, by its offsets.
 */
const LITERAL_PATTERN = /"""([\s\S]*?)"""|"((?:[^"\\\n]|\\.)*)"/;

/**
 * The event a row receives after it took the focus by request, carrying the {@link LineCaret}
 * that tells which of its fields gets the caret.
 */
export const LINE_CARET_EVENT = 'mentor-line-caret';

/**
 * Resolve a caret request against the text of a line.
 * @param text The text of the line.
 * @param caret The requested caret.
 * @returns The selection to apply, or `undefined` when the request names a literal the line lacks.
 */
export function resolveLineCaret(text: string, caret: LineCaret): LineSelection | undefined {
	if (typeof caret === 'number') {
		const offset = Math.max(0, Math.min(text.length, caret));

		return { start: offset, end: offset };
	}

	if (caret === 'end') {
		return { start: text.length, end: text.length };
	}

	const literal = _findLiteral(text);

	if (!literal) {
		return undefined;
	}

	return caret === 'label' ? literal : { start: literal.end, end: literal.end };
}

/**
 * Find the text inside the first closed quoted literal of a line.
 * @param text The text of the line.
 * @returns The selection of the literal's text, or `undefined` when the line has no closed literal.
 */
function _findLiteral(text: string): LineSelection | undefined {
	const match = LITERAL_PATTERN.exec(text);

	if (!match) {
		return undefined;
	}

	const quoteLength = match[1] !== undefined ? 3 : 1;
	const start = match.index + quoteLength;

	return { start, end: start + (match[1] ?? match[2]).length };
}

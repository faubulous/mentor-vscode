import { describe, expect, it } from 'vitest';
import { applyTextEdits, expandToWholeLines } from './text-edits';

/**
 * Remove a range of a text after expanding it to whole lines.
 */
function deleteLines(text: string, start: number, end: number): string {
	const lines = expandToWholeLines(text, start, end);

	return applyTextEdits(text, [{ start: lines.start, end: lines.end, newText: '' }]);
}

describe('expandToWholeLines', () => {
	it('takes a line with the line break after it', () => {
		const text = 'a\nb\nc\n';

		expect(deleteLines(text, 2, 3)).toBe('a\nc\n');
	});

	it('keeps the final line break when the last line goes', () => {
		const text = 'a\nb\n';

		expect(deleteLines(text, 2, 3)).toBe('a\n');
	});

	it('takes the line break before the last line when none follows it', () => {
		expect(deleteLines('a\nb', 2, 3)).toBe('a');
		expect(deleteLines('a\r\nb', 3, 4)).toBe('a');
	});

	it('leaves a range that shares its line with other text as it is', () => {
		expect(expandToWholeLines('a b\n', 2, 3)).toEqual({ start: 2, end: 3 });
	});
});

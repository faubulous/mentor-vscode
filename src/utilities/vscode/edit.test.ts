import { describe, it, expect } from 'vitest';
import { calculateLineOffset } from '@src/utilities/vscode/edit';

function makeEdit(entries: Array<[any, Array<{ startLine: number; endLine: number; newText: string }>]>) {
	return {
		entries: () => entries.map(([uri, edits]) => [
			uri,
			edits.map(e => ({
				range: { start: { line: e.startLine }, end: { line: e.endLine } },
				newText: e.newText,
			})),
		]),
	};
}

describe('calculateLineOffset', () => {
	it('returns 0 for an empty edit', () => {
		const edit = makeEdit([]);
		expect(calculateLineOffset(edit as any)).toBe(0);
	});

	it('returns 0 for an edit that replaces text on the same line (no line delta)', () => {
		// replace single line with single line → 0 net line change
		const edit = makeEdit([[null, [{ startLine: 2, endLine: 2, newText: 'new text' }]]]);
		expect(calculateLineOffset(edit as any)).toBe(0);
	});

	it('returns positive offset for an insertion that adds lines', () => {
		// insert "line1\nline2\nline3" — 2 newlines → +2 lines over a single-line range
		const edit = makeEdit([[null, [{ startLine: 5, endLine: 5, newText: 'a\nb\nc' }]]]);
		// newLines = 2, endLine - startLine = 0 → offset = 2 - 0 = 2
		expect(calculateLineOffset(edit as any)).toBe(2);
	});

	it('returns negative offset for a deletion', () => {
		// delete lines 3–6 (replace with empty string) → removes 3 lines
		const edit = makeEdit([[null, [{ startLine: 3, endLine: 6, newText: '' }]]]);
		// Deletion: -(endLine - startLine) = -3
		expect(calculateLineOffset(edit as any)).toBe(-3);
	});

	it('accumulates offsets across multiple edits in the same file', () => {
		// Edit 1: replace 2 lines with 3 lines (+1)
		// Edit 2: delete 4 lines (-4)
		const edit = makeEdit([
			[null, [
				{ startLine: 0, endLine: 2, newText: 'x\ny\nz' },   // newLines=2, span=2 → +0
				{ startLine: 5, endLine: 9, newText: '' },            // deletion: -(9-5) = -4
			]],
		]);
		expect(calculateLineOffset(edit as any)).toBe(-4);
	});

	it('accumulates offsets across multiple files', () => {
		// File 1: add 2 lines
		// File 2: delete 1 line
		const edit = makeEdit([
			['file1', [{ startLine: 0, endLine: 0, newText: 'a\nb\nc' }]],  // +2
			['file2', [{ startLine: 2, endLine: 3, newText: '' }]],           // -1
		]);
		expect(calculateLineOffset(edit as any)).toBe(1);
	});

	it('handles replacement that reduces line count', () => {
		// Replace 4 lines with 1 line → net -3
		const edit = makeEdit([[null, [{ startLine: 1, endLine: 5, newText: 'single line' }]]]);
		// newLines = 0, span = 4 → offset = 0 - 4 = -4
		expect(calculateLineOffset(edit as any)).toBe(-4);
	});

	it('handles replacement that increases line count', () => {
		// Replace 1 line with 3 lines → net +2
		const edit = makeEdit([[null, [{ startLine: 0, endLine: 1, newText: 'a\nb\nc' }]]]);
		// newLines = 2, span = 1 → offset = 2 - 1 = 1
		expect(calculateLineOffset(edit as any)).toBe(1);
	});
});

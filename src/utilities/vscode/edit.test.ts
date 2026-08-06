import { describe, it, expect } from 'vitest';
// The `vscode` module is aliased to `@src/utilities/mocks/vscode` in the vitest
// config, so these are the API-faithful mock implementations at runtime.
import { WorkspaceEdit, Range, Position, Uri } from 'vscode';
import { calculateLineOffset } from '@src/utilities/vscode/edit';

const uri = Uri.parse('file:///test.ttl');

describe('calculateLineOffset', () => {
	it('returns 0 for an empty edit', () => {
		const edit = new WorkspaceEdit();

		expect(calculateLineOffset(edit)).toBe(0);
	});

	it('returns 0 for an edit that replaces text on the same line (no line delta)', () => {
		// replace single line with single line → 0 net line change
		const edit = new WorkspaceEdit();
		edit.replace(uri, new Range(new Position(2, 0), new Position(2, 8)), 'new text');

		expect(calculateLineOffset(edit)).toBe(0);
	});

	it('returns positive offset for an insertion that adds lines', () => {
		// insert "a\nb\nc" — 2 newlines → +2 lines over a zero-length range on line 5
		const edit = new WorkspaceEdit();
		edit.insert(uri, new Position(5, 0), 'a\nb\nc');

		// newLines = 2, endLine - startLine = 0 → offset = 2 - 0 = 2
		expect(calculateLineOffset(edit)).toBe(2);
	});

	it('returns negative offset for a deletion', () => {
		// delete lines 3–6 (empty replacement text) → removes 3 lines
		const edit = new WorkspaceEdit();
		edit.delete(uri, new Range(new Position(3, 0), new Position(6, 0)));

		// Deletion: -(endLine - startLine) = -3
		expect(calculateLineOffset(edit)).toBe(-3);
	});

	it('accumulates offsets across multiple edits in the same file', () => {
		const edit = new WorkspaceEdit();
		// Edit 1: replace a 2-line span with 3 lines → newLines=2, span=2 → +0
		edit.replace(uri, new Range(new Position(0, 0), new Position(2, 0)), 'x\ny\nz');
		// Edit 2: delete lines 5–9 → deletion: -(9-5) = -4
		edit.delete(uri, new Range(new Position(5, 0), new Position(9, 0)));

		expect(calculateLineOffset(edit)).toBe(-4);
	});

	it('accumulates offsets across multiple files', () => {
		const edit = new WorkspaceEdit();
		// File 1: add 2 lines
		edit.insert(Uri.parse('file:///file1.ttl'), new Position(0, 0), 'a\nb\nc'); // +2
		// File 2: delete 1 line
		edit.delete(Uri.parse('file:///file2.ttl'), new Range(new Position(2, 0), new Position(3, 0))); // -1

		expect(calculateLineOffset(edit)).toBe(1);
	});

	it('handles replacement that reduces line count', () => {
		// Replace a 4-line span with 1 line
		const edit = new WorkspaceEdit();
		edit.replace(uri, new Range(new Position(1, 0), new Position(5, 0)), 'single line');

		// newLines = 0, span = 4 → offset = 0 - 4 = -4
		expect(calculateLineOffset(edit)).toBe(-4);
	});

	it('handles replacement that increases line count', () => {
		// Replace a 1-line span with 3 lines
		const edit = new WorkspaceEdit();
		edit.replace(uri, new Range(new Position(0, 0), new Position(1, 0)), 'a\nb\nc');

		// newLines = 2, span = 1 → offset = 2 - 1 = 1
		expect(calculateLineOffset(edit)).toBe(1);
	});
});

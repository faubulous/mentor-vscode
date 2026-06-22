import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { getRangeFromToken } from '@src/utilities/vscode/tokens';

function makeToken(image: string, startLine: number, startColumn: number, endLine: number, endColumn: number): any {
	return { tokenType: { name: 'PNAME_LN' }, image, startLine, startColumn, endLine, endColumn };
}

describe('getRangeFromToken', () => {
	it('converts 1-based token positions to a 0-based vscode.Range', () => {
		const range = getRangeFromToken(makeToken('ex:A', 2, 5, 2, 8));

		// Lines are 0-based: startLine 2 → 1.
		expect(range.start.line).toBe(1);
		// Columns: startColumn 5 → 4 (0-based).
		expect(range.start.character).toBe(4);
	});

	it('applies +1 to the end character', () => {
		const range = getRangeFromToken(makeToken('.', 1, 10, 1, 10));

		// endColumn 10 → 9 (0-based), then +1 = 10.
		expect(range.end.character).toBe(10);
	});

	it('adjusts for leading and trailing whitespace in the token image', () => {
		const range = getRangeFromToken(makeToken('  ex:A ', 1, 1, 1, 7));

		expect(range.start.character).toBe(2);
		expect(range.end.character).toBe(6);
	});
});

import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { createPositionMapper } from './position';

describe('createPositionMapper', () => {
	it('maps offsets on a single line to (0, character)', () => {
		const at = createPositionMapper('hello world');

		expect(at(0)).toMatchObject({ line: 0, character: 0 });
		expect(at(6)).toMatchObject({ line: 0, character: 6 });
	});

	it('maps offsets across multiple lines', () => {
		// "ab\ncd\nef" — line starts at offsets 0, 3, 6.
		const at = createPositionMapper('ab\ncd\nef');

		expect(at(0)).toMatchObject({ line: 0, character: 0 });
		expect(at(2)).toMatchObject({ line: 0, character: 2 }); // the '\n' itself
		expect(at(3)).toMatchObject({ line: 1, character: 0 }); // first char of line 1
		expect(at(4)).toMatchObject({ line: 1, character: 1 });
		expect(at(6)).toMatchObject({ line: 2, character: 0 });
		expect(at(7)).toMatchObject({ line: 2, character: 1 });
	});

	it('treats a leading newline as an empty first line', () => {
		const at = createPositionMapper('\nx');

		expect(at(0)).toMatchObject({ line: 0, character: 0 });
		expect(at(1)).toMatchObject({ line: 1, character: 0 });
	});

	it('counts the carriage return of a CRLF as a character of the preceding line', () => {
		// "a\r\nb" — offsets: 0=a, 1=\r, 2=\n, 3=b. Line starts at 0 and 3.
		const at = createPositionMapper('a\r\nb');

		expect(at(1)).toMatchObject({ line: 0, character: 1 }); // the '\r'
		expect(at(3)).toMatchObject({ line: 1, character: 0 }); // 'b'
	});

	it('clamps out-of-range offsets to the content bounds', () => {
		const at = createPositionMapper('abc');

		expect(at(-5)).toMatchObject({ line: 0, character: 0 });
		expect(at(100)).toMatchObject({ line: 0, character: 3 }); // clamped to length
	});
});

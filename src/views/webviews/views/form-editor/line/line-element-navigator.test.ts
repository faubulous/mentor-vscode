import { describe, expect, it } from 'vitest';
import { LineElementNavigator } from './line-element-navigator';

/**
 * Make a root whose line elements are the given fakes, and give every fake that root.
 */
function fakeLines(count: number): { root: ParentNode; lines: HTMLElement[] } {
	const lines = Array.from({ length: count }, (_, index) => ({ id: `line-${index}` })) as unknown as HTMLElement[];
	const root = { querySelectorAll: () => lines } as unknown as ParentNode;

	for (const line of lines) {
		(line as unknown as { getRootNode: () => ParentNode }).getRootNode = () => root;
	}

	return { root, lines };
}

describe('LineElementNavigator.lineElements', () => {
	it('lists the line elements in document order', () => {
		const { root, lines } = fakeLines(3);

		expect(new LineElementNavigator(root).lineElements()).toEqual(lines);
	});
});

describe('LineElementNavigator.nextLineElement', () => {
	it('finds the neighbouring line in either direction', () => {
		const { root, lines } = fakeLines(3);
		const navigator = new LineElementNavigator(root);

		expect(navigator.nextLineElement(lines[1], 'next')).toBe(lines[2]);
		expect(navigator.nextLineElement(lines[1], 'previous')).toBe(lines[0]);
	});

	it('finds nothing beyond the first or last line, or for a stranger', () => {
		const { root, lines } = fakeLines(2);
		const navigator = new LineElementNavigator(root);

		expect(navigator.nextLineElement(lines[1], 'next')).toBeUndefined();
		expect(navigator.nextLineElement(lines[0], 'previous')).toBeUndefined();
		expect(navigator.nextLineElement({ id: 'other' } as unknown as HTMLElement, 'next')).toBeUndefined();
	});

	it('searches the root of an element', () => {
		const { lines } = fakeLines(2);

		expect(LineElementNavigator.forElement(lines[0]).nextLineElement(lines[0], 'next')).toBe(lines[1]);
	});
});

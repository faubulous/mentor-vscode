// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { LineElementNavigator, VALUE_STOP_ATTRIBUTE } from './line-element-navigator';

/**
 * Build a list with the given stops and one element between the second and third stop.
 */
function list(): { root: HTMLElement; stops: HTMLElement[]; between: HTMLElement } {
	const root = document.createElement('div');

	root.innerHTML = `<span ${VALUE_STOP_ATTRIBUTE} id="a"></span><span ${VALUE_STOP_ATTRIBUTE} id="b"></span><span id="between"></span><span ${VALUE_STOP_ATTRIBUTE} id="c"></span>`;

	const stops = ['a', 'b', 'c'].map(id => root.querySelector<HTMLElement>(`#${id}`) as HTMLElement);

	return { root, stops, between: root.querySelector('#between') as HTMLElement };
}

describe('LineElementNavigator.nextValueStop', () => {
	it('walks the stops in document order', () => {
		const { root, stops } = list();
		const navigator = new LineElementNavigator(root);

		expect(navigator.nextValueStop(stops[0], 'next')).toBe(stops[1]);
		expect(navigator.nextValueStop(stops[1], 'previous')).toBe(stops[0]);
		expect(navigator.nextValueStop(stops[2], 'next')).toBeUndefined();
		expect(navigator.nextValueStop(stops[0], 'previous')).toBeUndefined();
	});

	it('finds the stops around an element that is no stop', () => {
		const { root, stops, between } = list();
		const navigator = new LineElementNavigator(root);

		expect(navigator.nextValueStop(between, 'next')).toBe(stops[2]);
		expect(navigator.nextValueStop(between, 'previous')).toBe(stops[1]);
	});
});

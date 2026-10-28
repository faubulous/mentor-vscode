import { useEffect, useState } from 'react';

/**
 * The bars that stay at the top of the scroll container while the form scrolls: the context bar,
 * once the title of the document has scrolled away.
 */
const STICKY_SELECTORS = ['.context-bar'];

/**
 * Measure how much of the top of the scroll container the sticky bars cover while the form is
 * scrolled down, so an entry scrolled to the top lands below them instead of under them.
 * @param scrollElement The scroll container.
 * @returns The height the sticky bars cover, in pixels.
 */
export function useStickyHeight(scrollElement: HTMLElement | null): number {
	const [height, setHeight] = useState(0);

	useEffect(() => {
		if (!scrollElement) {
			return;
		}

		const measure = (): void => setHeight(_stickyHeightOf(scrollElement));
		const observer = new ResizeObserver(measure);

		for (const element of _stickyElementsOf(scrollElement)) {
			observer.observe(element);
		}

		measure();

		return () => observer.disconnect();
	}, [scrollElement]);

	return height;
}

/**
 * The sticky bars present in the scroll container.
 * @param scrollElement The scroll container.
 * @returns The bars.
 */
function _stickyElementsOf(scrollElement: HTMLElement): HTMLElement[] {
	return STICKY_SELECTORS
		.map(selector => scrollElement.querySelector<HTMLElement>(selector))
		.filter((element): element is HTMLElement => element !== null);
}

/**
 * The height of the tallest sticky bar. The context bar keeps its height while it is hidden, as
 * it is shown whenever an entry further down is scrolled to.
 * @param scrollElement The scroll container.
 * @returns The height in pixels.
 */
function _stickyHeightOf(scrollElement: HTMLElement): number {
	return Math.max(0, ..._stickyElementsOf(scrollElement).map(element => element.offsetHeight));
}

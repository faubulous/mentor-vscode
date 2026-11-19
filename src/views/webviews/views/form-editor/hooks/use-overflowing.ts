import { RefObject, useLayoutEffect, useState } from 'react';

/**
 * Follow whether the content of an element is taller than the element shows, as a text cut after
 * a few lines is. Measured again whenever the element or its content is resized, and whenever
 * the given value changes.
 * @param elementRef The element.
 * @param content What the element shows, which may change its height.
 * @returns `true` while the content overflows the element.
 */
export function useOverflowing(elementRef: RefObject<HTMLElement | null>, content: unknown): boolean {
	const [overflowing, setOverflowing] = useState(false);

	useLayoutEffect(() => {
		const element = elementRef.current;

		if (!element) {
			return;
		}

		const measure = (): void => setOverflowing(element.scrollHeight > element.clientHeight + 1);

		measure();

		if (typeof ResizeObserver === 'undefined') {
			return;
		}

		const observer = new ResizeObserver(measure);

		observer.observe(element);

		if (element.firstElementChild) {
			observer.observe(element.firstElementChild);
		}

		return () => observer.disconnect();
	}, [elementRef, content]);

	return overflowing;
}

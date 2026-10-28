import { useEffect, useState } from 'react';

/**
 * Tell whether an element has scrolled out of view above the top of its scroll container, as the
 * header of the form does once the reader scrolls down to the entries.
 * @param scrollElement The scroll container.
 * @param element The element to watch.
 * @returns Whether the element lies entirely above the visible part of the container.
 */
export function useScrolledPast(scrollElement: HTMLElement | null, element: HTMLElement | null): boolean {
	const [past, setPast] = useState(false);

	useEffect(() => {
		if (!scrollElement || !element) {
			setPast(false);

			return;
		}

		const observer = new IntersectionObserver(([entry]) => {
			const rootTop = entry.rootBounds?.top ?? 0;

			setPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= rootTop);
		}, { root: scrollElement, threshold: 0 });

		observer.observe(element);

		return () => observer.disconnect();
	}, [scrollElement, element]);

	return past;
}

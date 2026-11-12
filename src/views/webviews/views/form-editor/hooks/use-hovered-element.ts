import { useEffect, useState } from 'react';

/**
 * The element the pointer rests on: the closest element that matches the selector, once the
 * pointer has stayed on it for the delay given. Leaving the element, pressing a key or a button and
 * scrolling let it go.
 * @param selector Matches the elements that count.
 * @param delay How long the pointer rests on an element before it counts, in milliseconds.
 * @returns The element, or `undefined` while the pointer rests on none.
 */
export function useHoveredElement(selector: string, delay: number): Element | undefined {
	const [hovered, setHovered] = useState<Element>();

	useEffect(() => {
		let target: Element | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;

		const release = (): void => {
			clearTimeout(timer);
			timer = undefined;
			target = undefined;
			setHovered(undefined);
		};

		const handlePointerOver = (event: PointerEvent): void => {
			const element = event.target instanceof Element ? event.target.closest(selector) ?? undefined : undefined;

			if (element === target) {
				return;
			}

			release();

			if (element) {
				target = element;
				timer = setTimeout(() => setHovered(element), delay);
			}
		};

		const handlePointerOut = (event: PointerEvent): void => {
			if (target && !(event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) {
				release();
			}
		};

		document.addEventListener('pointerover', handlePointerOver);
		document.addEventListener('pointerout', handlePointerOut);
		document.addEventListener('pointerdown', release, true);
		document.addEventListener('keydown', release, true);
		document.addEventListener('scroll', release, true);

		return () => {
			clearTimeout(timer);
			document.removeEventListener('pointerover', handlePointerOver);
			document.removeEventListener('pointerout', handlePointerOut);
			document.removeEventListener('pointerdown', release, true);
			document.removeEventListener('keydown', release, true);
			document.removeEventListener('scroll', release, true);
		};
	}, [selector, delay]);

	return hovered;
}

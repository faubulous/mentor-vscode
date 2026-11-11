import { RefObject, useLayoutEffect, useState } from 'react';

/**
 * How a text wraps in a box: the lines it takes, and how many of them the box shows at rest.
 */
export interface WrappedLines {
	/**
	 * The number of lines the text takes at the width of the box.
	 */
	count: number;

	/**
	 * The number of lines the box shows at rest, by the `--clamp` property of the box: 1 for a box
	 * that keeps its text on one line, `Infinity` for one that does not cut it.
	 */
	clamp: number;
}

/**
 * Follow how many lines a text takes in a box as wide as an element, less the room the element
 * keeps beside it, in the font of the element: words wrap at spaces, a word too long for a line
 * breaks, and every line break of the text starts a line. Measured again whenever the element is
 * resized. Where the browser measures no text, as a test without one does, the text takes a line.
 * @param elementRef The element the text is shown in.
 * @param text The text.
 * @param reservedOf The width the element keeps beside the text, in pixels.
 * @returns The lines.
 */
export function useWrappedLines(elementRef: RefObject<HTMLElement | null>, text: string, reservedOf: (element: HTMLElement) => number): WrappedLines {
	const [lines, setLines] = useState<WrappedLines>({ count: 1, clamp: 1 });

	useLayoutEffect(() => {
		const element = elementRef.current;

		if (!element) {
			return;
		}

		const measure = (): void => {
			const next = _measure(element, text, reservedOf(element));

			setLines(current => current.count === next.count && current.clamp === next.clamp ? current : next);
		};

		measure();

		if (typeof ResizeObserver === 'undefined') {
			return;
		}

		const observer = new ResizeObserver(measure);

		observer.observe(element);

		return () => observer.disconnect();
	}, [elementRef, text, reservedOf]);

	return lines;
}

/**
 * The canvas the widths of texts are measured with, shared by every box.
 */
let canvas: HTMLCanvasElement | undefined;

/**
 * Measure how a text wraps in an element.
 * @param element The element.
 * @param text The text.
 * @param reserved The width beside the text, in pixels.
 * @returns The lines.
 */
function _measure(element: HTMLElement, text: string, reserved: number): WrappedLines {
	const style = getComputedStyle(element);
	const clampValue = style.getPropertyValue('--clamp').trim();
	const clamp = clampValue === '' ? 1 : clampValue === 'none' ? Infinity : Number(clampValue) || 1;
	const context = (canvas ??= document.createElement('canvas')).getContext('2d');
	const width = element.clientWidth - reserved;

	if (!context || width <= 0) {
		return { count: 1, clamp };
	}

	context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

	return { count: text.split('\n').reduce((count, paragraph) => count + _linesOf(paragraph, width, context), 0), clamp };
}

/**
 * Count the lines one paragraph takes, wrapping its words at spaces and breaking a word too long
 * for a line.
 * @param paragraph The paragraph.
 * @param width The width of a line.
 * @param context Measures the widths.
 * @returns The number of lines, at least one.
 */
function _linesOf(paragraph: string, width: number, context: CanvasRenderingContext2D): number {
	let lines = 1;
	let line = 0;

	for (const word of paragraph.split(' ')) {
		const wordWidth = context.measureText(word).width;
		const spaced = line === 0 ? wordWidth : line + context.measureText(' ').width + wordWidth;

		if (spaced <= width) {
			line = spaced;
		} else if (wordWidth <= width) {
			lines++;
			line = wordWidth;
		} else {
			lines += Math.ceil(wordWidth / width) - (line === 0 ? 1 : 0);
			line = wordWidth % width;
		}
	}

	return lines;
}

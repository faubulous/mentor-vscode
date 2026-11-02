import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * A mark on the ruler: a resource, a comment, or a resource the filter matched, by where it
 * starts in the scroll content.
 */
export interface RulerMark {
	/**
	 * What the mark stands for.
	 */
	kind: 'resource' | 'comment' | 'match';

	/**
	 * The offset of the block in the scroll content.
	 */
	offset: number;
}

/**
 * Properties of the {@link OverviewRuler} component.
 */
export interface OverviewRulerProps {
	/**
	 * The scroll container whose scrollbar the ruler lies under.
	 */
	scrollElement: HTMLElement | null;

	/**
	 * The marks to draw.
	 */
	marks: readonly RulerMark[];

	/**
	 * Changes when the content changes height, which moves every mark.
	 */
	contentHeight: number;
}

/**
 * How wide the ruler is where the scrollbar takes no room, as an overlay scrollbar does.
 */
const OVERLAY_WIDTH = 8;

/**
 * The marks of the whole document drawn under the scrollbar of the form, as the overview ruler
 * of a text editor: a tick per resource, a mark per comment and the matches of the filter. The
 * scrollbar stays the browser's own, so dragging, paging and the keyboard work as everywhere, and
 * its track is transparent so the marks show through it. The ruler takes no input.
 * @param props The scroll container and the marks.
 * @returns The ruler.
 */
export function OverviewRuler({ scrollElement, marks, contentHeight }: OverviewRulerProps): React.JSX.Element {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const size = useScrollbarSize(scrollElement);

	useRulerDrawing(canvasRef, marks, scrollElement, size, contentHeight);

	return (
		<div className="overview-ruler" aria-hidden="true" style={{ width: size.width, height: size.height }}>
			<canvas ref={canvasRef} className="overview-ruler-marks" />
		</div>
	);
}

/**
 * Follow the size of the vertical scrollbar of a scroll container: as wide as the scrollbar, or
 * a narrow strip where the scrollbar overlays the content, and as tall as the container.
 * @param scrollElement The scroll container.
 * @returns The width and the height of the scrollbar.
 */
function useScrollbarSize(scrollElement: HTMLElement | null): { width: number; height: number } {
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		if (!scrollElement) {
			return;
		}

		const update = (): void => {
			const style = getComputedStyle(scrollElement);
			const borders = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
			const width = scrollElement.offsetWidth - scrollElement.clientWidth - (borders || 0);

			setSize({ width: width > 0 ? width : OVERLAY_WIDTH, height: scrollElement.clientHeight });
		};
		const observer = new ResizeObserver(update);

		update();
		observer.observe(scrollElement);

		return () => observer.disconnect();
	}, [scrollElement]);

	return size;
}

/**
 * Draw the marks on the canvas of the ruler, in the colours of the theme, again whenever they or
 * the size of the ruler change.
 * @param canvasRef The canvas.
 * @param marks The marks.
 * @param scrollElement The scroll container.
 * @param size The size of the ruler.
 * @param contentHeight The height of the content, which moves the marks when it changes.
 */
function useRulerDrawing(canvasRef: RefObject<HTMLCanvasElement | null>, marks: readonly RulerMark[], scrollElement: HTMLElement | null, size: { width: number; height: number }, contentHeight: number): void {
	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		const total = scrollElement?.scrollHeight ?? 0;

		if (canvas && total > 0 && size.width > 0 && size.height > 0) {
			_draw(canvas, marks, total, size);
		}
	}, [canvasRef, marks, scrollElement, size, contentHeight]);
}

/**
 * Draw the marks: a thin tick per resource in the middle of the ruler, a thicker mark across it
 * per comment and per match. A mark sits where the scrollbar's thumb would put its top edge.
 * @param canvas The canvas.
 * @param marks The marks.
 * @param total The height of the scroll content.
 * @param size The size of the ruler.
 */
function _draw(canvas: HTMLCanvasElement, marks: readonly RulerMark[], total: number, size: { width: number; height: number }): void {
	const ratio = window.devicePixelRatio || 1;
	const context = canvas.getContext('2d');

	canvas.width = Math.round(size.width * ratio);
	canvas.height = Math.round(size.height * ratio);
	canvas.style.width = `${size.width}px`;
	canvas.style.height = `${size.height}px`;

	if (!context) {
		return;
	}

	const style = getComputedStyle(canvas);

	context.scale(ratio, ratio);

	for (const mark of marks) {
		const thick = mark.kind !== 'resource';
		const inset = thick ? 1 : Math.round(size.width / 4);
		const y = (mark.offset / total) * size.height;

		context.globalAlpha = thick ? 1 : 0.75;
		context.fillStyle = style.getPropertyValue(`--ruler-${mark.kind}`).trim() || 'gray';
		context.fillRect(inset, y, size.width - 2 * inset, thick ? 3 : 1.5);
	}
}

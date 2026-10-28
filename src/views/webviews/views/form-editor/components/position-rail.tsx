import { PointerEvent, RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * A mark on the rail: a resource, a comment, or a resource the filter matched, by where it starts
 * in the scroll content.
 */
export interface RailMark {
	/**
	 * What the mark stands for.
	 */
	kind: 'resource' | 'comment' | 'match';

	/**
	 * The offset of the block in the scroll content.
	 */
	offset: number;

	/**
	 * What the mark is, told when the pointer rests on it.
	 */
	title?: string;
}

/**
 * Properties of the {@link PositionRail} component.
 */
export interface PositionRailProps {
	/**
	 * The scroll container the rail maps.
	 */
	scrollElement: HTMLElement | null;

	/**
	 * The marks to draw.
	 */
	marks: readonly RailMark[];

	/**
	 * Changes when the content changes height, which moves every mark.
	 */
	contentHeight: number;
}

/**
 * How near the pointer must come to a mark, in pixels, for the rail to name it.
 */
const HOVER_DISTANCE = 3;

/**
 * The narrow column at the right of the view that maps the whole document: a tick per resource,
 * a mark per comment, the matches of the filter, and the part in view, which can be dragged. A
 * press anywhere scrolls there. It is an aid for the pointer only; the keyboard navigates with the
 * filter and the definition tree.
 * @param props The scroll container and the marks.
 * @returns The rail.
 */
export function PositionRail({ scrollElement, marks, contentHeight }: PositionRailProps): React.JSX.Element {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const railRef = useRef<HTMLDivElement>(null);
	const viewport = useViewport(scrollElement);
	const [title, setTitle] = useState<string>();

	useRailDrawing(canvasRef, railRef, marks, scrollElement, contentHeight);

	const scrollToPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
		if (!scrollElement || (event.target !== event.currentTarget && !(event.target instanceof HTMLCanvasElement))) {
			return;
		}

		const ratio = (event.clientY - event.currentTarget.getBoundingClientRect().top) / event.currentTarget.clientHeight;

		scrollElement.scrollTo({ top: ratio * scrollElement.scrollHeight - scrollElement.clientHeight / 2 });
	}, [scrollElement]);

	const nameMark = useCallback((event: PointerEvent<HTMLDivElement>) => {
		setTitle(_markNear(marks, scrollElement, event.clientY - event.currentTarget.getBoundingClientRect().top, event.currentTarget.clientHeight)?.title);
	}, [marks, scrollElement]);

	return (
		<div ref={railRef} className="position-rail" aria-hidden="true" title={title} onPointerDown={scrollToPointer} onPointerMove={nameMark}>
			<canvas ref={canvasRef} className="position-rail-marks" />
			<RailViewport scrollElement={scrollElement} top={viewport.top} height={viewport.height} />
		</div>
	);
}

/**
 * Properties of the {@link RailViewport} component.
 */
interface RailViewportProps {
	/**
	 * The scroll container.
	 */
	scrollElement: HTMLElement | null;

	/**
	 * The top of the part in view, as a share of the content.
	 */
	top: number;

	/**
	 * The height of the part in view, as a share of the content.
	 */
	height: number;
}

/**
 * The part of the document in view, which scrolls the view when it is dragged.
 * @param props The scroll container and the part in view.
 * @returns The viewport.
 */
function RailViewport({ scrollElement, top, height }: RailViewportProps): React.JSX.Element {
	const drag = useRef<{ y: number; scrollTop: number } | undefined>(undefined);

	return (
		<div
			className="position-rail-viewport"
			style={{ top: `${top * 100}%`, height: `${Math.max(height * 100, 1)}%` }}
			onPointerDown={event => {
				event.stopPropagation();
				event.currentTarget.setPointerCapture(event.pointerId);
				drag.current = { y: event.clientY, scrollTop: scrollElement?.scrollTop ?? 0 };
			}}
			onPointerMove={event => {
				const rail = event.currentTarget.parentElement;

				if (drag.current && scrollElement && rail) {
					const scale = scrollElement.scrollHeight / rail.clientHeight;

					scrollElement.scrollTop = drag.current.scrollTop + (event.clientY - drag.current.y) * scale;
				}
			}}
			onPointerUp={() => {
				drag.current = undefined;
			}}
		/>
	);
}

/**
 * Follow the part of the content in view, as shares of its height.
 * @param scrollElement The scroll container.
 * @returns The top and the height of the part in view, as shares.
 */
function useViewport(scrollElement: HTMLElement | null): { top: number; height: number } {
	const [viewport, setViewport] = useState({ top: 0, height: 1 });

	useEffect(() => {
		if (!scrollElement) {
			return;
		}

		const update = (): void => {
			const total = Math.max(scrollElement.scrollHeight, 1);

			setViewport({ top: scrollElement.scrollTop / total, height: scrollElement.clientHeight / total });
		};
		const observer = new ResizeObserver(update);

		update();
		scrollElement.addEventListener('scroll', update, { passive: true });
		observer.observe(scrollElement);

		return () => {
			scrollElement.removeEventListener('scroll', update);
			observer.disconnect();
		};
	}, [scrollElement]);

	return viewport;
}

/**
 * Draw the marks on the canvas of the rail, in the colours of the theme, again whenever they or
 * the size of the rail change.
 * @param canvasRef The canvas.
 * @param railRef The rail, whose size the canvas takes.
 * @param marks The marks.
 * @param scrollElement The scroll container.
 * @param contentHeight The height of the content, which moves the marks when it changes.
 */
function useRailDrawing(canvasRef: RefObject<HTMLCanvasElement | null>, railRef: RefObject<HTMLDivElement | null>, marks: readonly RailMark[], scrollElement: HTMLElement | null, contentHeight: number): void {
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const rail = railRef.current;

		if (!rail) {
			return;
		}

		const observer = new ResizeObserver(() => setSize({ width: rail.clientWidth, height: rail.clientHeight }));

		observer.observe(rail);

		return () => observer.disconnect();
	}, [railRef]);

	useLayoutEffect(() => {
		const canvas = canvasRef.current;
		const total = scrollElement?.scrollHeight ?? 0;

		if (canvas && total > 0 && size.height > 0) {
			_draw(canvas, marks, total, size);
		}
	}, [canvasRef, marks, scrollElement, size, contentHeight]);
}

/**
 * Draw the marks: a thin tick per resource, a thicker mark per comment and per match.
 * @param canvas The canvas.
 * @param marks The marks.
 * @param total The height of the scroll content.
 * @param size The size of the rail.
 */
function _draw(canvas: HTMLCanvasElement, marks: readonly RailMark[], total: number, size: { width: number; height: number }): void {
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
		const inset = thick ? 3 : 5;
		const y = (mark.offset / total) * size.height;

		context.globalAlpha = thick ? 1 : 0.75;
		context.fillStyle = style.getPropertyValue(`--rail-${mark.kind}`).trim() || 'gray';
		context.fillRect(inset, y, size.width - 2 * inset, thick ? 3 : 1.5);
	}
}

/**
 * The mark nearest to a point of the rail, when one is near enough to name.
 * @param marks The marks.
 * @param scrollElement The scroll container.
 * @param y The point on the rail.
 * @param height The height of the rail.
 * @returns The mark, or `undefined` when none is near.
 */
function _markNear(marks: readonly RailMark[], scrollElement: HTMLElement | null, y: number, height: number): RailMark | undefined {
	const total = scrollElement?.scrollHeight ?? 0;

	if (total <= 0) {
		return undefined;
	}

	let nearest: RailMark | undefined;
	let distance = HOVER_DISTANCE;

	for (const mark of marks) {
		const gap = Math.abs((mark.offset / total) * height - y);

		if (gap <= distance) {
			nearest = mark;
			distance = gap;
		}
	}

	return nearest;
}

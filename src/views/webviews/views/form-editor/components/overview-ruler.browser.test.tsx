import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { OverviewRuler, RulerMark } from './overview-ruler';

/**
 * The height of the scroll content in the harness.
 */
const CONTENT_HEIGHT = 3000;

/**
 * The height of the scroll area in the harness.
 */
const VIEW_HEIGHT = 300;

/**
 * The body of the form, as the editor lays it out: the ruler host under the scroll area, and the
 * ruler drawn into it.
 */
function Harness({ marks }: { marks: RulerMark[] }): React.JSX.Element {
	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
	const [rulerElement, setRulerElement] = useState<HTMLDivElement | null>(null);

	return (
		<div className="form-editor-body" style={{ width: 600, height: VIEW_HEIGHT }}>
			<div className="form-editor-ruler" ref={setRulerElement} />
			<div className="form-editor-scroll" ref={setScrollElement}>
				<div style={{ height: CONTENT_HEIGHT }} />
			</div>
			{rulerElement && createPortal(<OverviewRuler scrollElement={scrollElement} marks={marks} contentHeight={CONTENT_HEIGHT} />, rulerElement)}
		</div>
	);
}

/**
 * Render the body with marks and wait until the ruler has its size.
 */
async function renderRuler(marks: RulerMark[]) {
	const { container } = render(<Harness marks={marks} />);
	const scroll = container.querySelector<HTMLElement>('.form-editor-scroll')!;
	const ruler = container.querySelector<HTMLElement>('.overview-ruler')!;
	const canvas = container.querySelector<HTMLCanvasElement>('.overview-ruler-marks')!;

	await expect.poll(() => ruler.getBoundingClientRect().height).toBe(VIEW_HEIGHT);

	return { scroll, ruler, canvas };
}

/**
 * Whether the canvas has anything drawn in a row, in pixels of the ruler.
 */
function isDrawnAt(canvas: HTMLCanvasElement, y: number): boolean {
	const ratio = canvas.height / canvas.getBoundingClientRect().height;
	const row = canvas.getContext('2d')!.getImageData(0, Math.round(y * ratio), canvas.width, 1).data;

	return row.some((value, index) => index % 4 === 3 && value > 0);
}

describe('OverviewRuler', () => {
	it('lies under the native scrollbar, as wide and as tall as it, at the right edge', async () => {
		const { scroll, ruler } = await renderRuler([]);
		const scrollbarWidth = scroll.offsetWidth - scroll.clientWidth;
		const rulerBox = ruler.getBoundingClientRect();

		expect(scrollbarWidth).toBeGreaterThan(0);
		expect(rulerBox.width).toBe(scrollbarWidth);
		expect(rulerBox.right).toBe(scroll.getBoundingClientRect().right);
	});

	it('leaves the pointer to the scrollbar above it', async () => {
		const { scroll, ruler } = await renderRuler([]);
		const box = ruler.getBoundingClientRect();

		expect(document.elementFromPoint(box.left + box.width / 2, box.top + 100)).toBe(scroll);
	});

	it('draws a mark where the content offset falls on the track', async () => {
		const { canvas } = await renderRuler([{ kind: 'comment', offset: CONTENT_HEIGHT / 2 }]);

		await expect.poll(() => isDrawnAt(canvas, VIEW_HEIGHT / 2 + 1)).toBe(true);

		expect(isDrawnAt(canvas, VIEW_HEIGHT / 4)).toBe(false);
	});
});

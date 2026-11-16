import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from '@testing-library/react';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { FormEditorContext } from '../state/form-editor-context';
import { getResourceTooltipAttributes, ResourceTooltip } from './resource-tooltip';

/**
 * Render two resources of no card, one at the top of the view and one at its bottom, with the
 * tooltip of the form.
 */
function renderResources(): { top: HTMLElement; bottom: HTMLElement } {
	const { container } = render(
		<div className="form-editor">
			<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {} }}>
				<span className="top" style={{ position: 'fixed', top: 40, left: 40 }} {...getResourceTooltipAttributes(RdfDataFactory.namedNode('http://example.org/top'))}>top</span>
				<span className="bottom" style={{ position: 'fixed', bottom: 0, left: 40 }} {...getResourceTooltipAttributes(RdfDataFactory.namedNode('http://example.org/bottom'))}>bottom</span>
				<ResourceTooltip documentDataService={createResourceDataServiceStub()} storeDataService={createResourceDataServiceStub()} />
			</FormEditorContext.Provider>
		</div>
	);

	return { top: container.querySelector<HTMLElement>('.top')!, bottom: container.querySelector<HTMLElement>('.bottom')! };
}

/**
 * Rest the pointer on an element until its tooltip shows.
 * @param element The element.
 * @returns The tooltip.
 */
async function hover(element: HTMLElement): Promise<HTMLElement> {
	await userEvent.hover(element);
	await expect.poll(() => document.querySelector('.resource-tooltip'), { timeout: 2000 }).not.toBeNull();

	return document.querySelector<HTMLElement>('.resource-tooltip')!;
}

/**
 * Expect two positions within a pixel of each other, as the tooltip is placed by its whole-pixel
 * size.
 * @param actual The position found.
 * @param expected The position expected.
 */
function expectNear(actual: number, expected: number): void {
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);
}

describe('ResourceTooltip, in a browser', () => {
	it('stands under its element, by the gap the stylesheet gives, from its left edge', async () => {
		const { top } = renderResources();
		const tooltip = await hover(top);
		const gap = parseFloat(getComputedStyle(tooltip).getPropertyValue('--tooltip-gap'));

		expect(gap).toBeGreaterThan(0);
		expectNear(tooltip.getBoundingClientRect().top, top.getBoundingClientRect().bottom + gap);
		expectNear(tooltip.getBoundingClientRect().left, top.getBoundingClientRect().left);
	});

	it('stands above an element at the bottom of the view', async () => {
		const { bottom } = renderResources();
		const tooltip = await hover(bottom);
		const gap = parseFloat(getComputedStyle(tooltip).getPropertyValue('--tooltip-gap'));

		expectNear(tooltip.getBoundingClientRect().bottom, bottom.getBoundingClientRect().top - gap);
	});
});

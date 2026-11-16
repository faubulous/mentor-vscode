// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { RDFS } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { createLiteralView, createProperty, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { ResourceSummary } from '../form-editor-model';
import { FormEditorContext } from '../state/form-editor-context';
import { getResourceTooltipAttributes, ResourceTooltip } from './resource-tooltip';

/**
 * A resource of the document, with a description, its types and its usages.
 */
const TREE = createResourceSummary('Tree', { label: 'Apple tree', description: 'A tree bearing apples', typeLabels: ['Class', 'Plant'], usageCount: 3 });

/**
 * Observes nothing; the tooltip places itself once as it shows.
 */
class FakeResizeObserver {
	observe(): void { }

	disconnect(): void { }
}

/**
 * Render the tooltip beside a resource of the document, an IRI of no resource of it anchored at its
 * end, and a blank node.
 * @param tree The summary of the resource of the document.
 * @param loaded Whether the statements of the resource are at hand.
 */
function renderTooltip(tree: ResourceSummary = TREE, loaded = true) {
	const detail = { ...createTestResourceDetail([createProperty('rdfs:comment', [createLiteralView('A tree bearing apples')])]), term: tree.term };
	const dataService = createResourceDataServiceStub(loaded ? [detail] : []);
	const result = renderWebview(
		<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {}, resources: [tree], descriptionPredicates: [RdfDataFactory.namedNode(RDFS.comment)] }}>
			<span className="tree" {...getResourceTooltipAttributes(tree.term)}>Apple tree</span>
			<span className="other" {...getResourceTooltipAttributes(RdfDataFactory.namedNode('http://x/y'), 'end')}>y</span>
			<span className="node" {...getResourceTooltipAttributes(RdfDataFactory.blankNode('b1'))}>node</span>
			<ResourceTooltip dataService={dataService} />
		</FormEditorContext.Provider>
	);

	return { ...result, dataService };
}

/**
 * Rest the pointer on an element for as long as the tooltip waits.
 */
function hover(element: Element): void {
	fireEvent.pointerOver(element);
	act(() => {
		vi.advanceTimersByTime(400);
	});
}

describe('ResourceTooltip', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('ResizeObserver', FakeResizeObserver);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('shows the compact card of a resource of the document once the pointer rests on it', () => {
		const { container } = renderTooltip();

		fireEvent.pointerOver(container.querySelector('.tree')!);
		act(() => {
			vi.advanceTimersByTime(399);
		});

		expect(screen.queryByRole('tooltip')).toBeNull();

		act(() => {
			vi.advanceTimersByTime(1);
		});

		const card = screen.getByRole('tooltip').querySelector('.resource-card.is-compact')!;

		expect(card.getAttribute('data-density')).toBe('tooltip');
		expect(card.querySelector('.resource-card-label')?.textContent).toBe('Apple tree');
		expect(card.querySelector('.compact-card-types')?.textContent).toBe('Class, Plant');
		expect(card.querySelector('.resource-card-description')?.textContent).toBe('A tree bearing apples');
		expect(card.querySelector('.compact-card-iri')?.textContent).toBe(TREE.term.value);
		expect(card.querySelector('.card-usage')?.textContent).toBe('3 usages');
		expect(card.querySelector('[role="button"], button')).toBeNull();
	});

	it('asks for no statements of a resource without pins', () => {
		const { container, dataService } = renderTooltip({ ...TREE, pins: [] }, false);

		hover(container.querySelector('.tree')!);

		expect(dataService.requested).toEqual([]);
	});

	it('asks for the statements its pinned properties are read from', () => {
		const { container, dataService } = renderTooltip({ ...TREE, pins: [{ predicate: RdfDataFactory.namedNode(RDFS.comment), scope: 'workspace' }] }, false);

		hover(container.querySelector('.tree')!);

		expect(dataService.requested).toEqual([TREE.term]);
	});

	it('shows the pinned properties of a resource as items that open nothing', () => {
		const { container } = renderTooltip({ ...TREE, pins: [{ predicate: RdfDataFactory.namedNode(RDFS.comment), scope: 'workspace' }] });

		hover(container.querySelector('.tree')!);

		const item = container.querySelector('.resource-tooltip .pinned-property')!;

		expect(item.textContent).toContain('A tree bearing apples');
		expect(item.getAttribute('role')).toBeNull();
	});

	it('shows only the IRI of a resource the document does not describe', () => {
		const { container } = renderTooltip();

		hover(container.querySelector('.other')!);

		expect(screen.getByRole('tooltip').textContent).toBe('http://x/y');
		expect(screen.getByRole('tooltip').classList.contains('is-card')).toBe(false);
	});

	it('hides when the pointer leaves the resource or a key is pressed, and shows nothing for a blank node', () => {
		const { container } = renderTooltip();
		const tree = container.querySelector('.tree')!;

		hover(tree);
		fireEvent.pointerOut(tree, { relatedTarget: container.querySelector('.other') });

		expect(screen.queryByRole('tooltip')).toBeNull();

		hover(tree);
		fireEvent.keyDown(document.body, { key: 'a' });

		expect(screen.queryByRole('tooltip')).toBeNull();

		hover(container.querySelector('.node')!);

		expect(screen.queryByRole('tooltip')).toBeNull();
	});
});

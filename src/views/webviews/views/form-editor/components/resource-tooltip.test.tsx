// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NamedNode } from '@rdfjs/types';
import { act, fireEvent, screen } from '@testing-library/react';
import { RDFS } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceListItem } from '@src/utilities/mocks/resource-list-item-fixtures';
import { createLiteralView, createProperty, createTestCardBody } from '@src/utilities/mocks/statement-fixtures';
import { ResourceListItemData } from '../form-editor-model';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { ResourceDataService } from '../services/resource-data-service';
import { FormEditorContext } from '../state/form-editor-context';
import { getResourceTooltipAttributes, ResourceTooltip } from './resource-tooltip';

/**
 * A resource of the document, with a description, its types and its usages.
 */
const TREE = createResourceListItem('Tree', { label: 'Apple tree', description: 'A tree bearing apples', typeLabels: ['Class', 'Plant'], usageCount: 3 });

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
 * @param tree The list item of the resource of the document.
 * @param loaded Whether the statements of the resource are at hand.
 * @param storeDataService Supplies the resources of the store.
 */
function renderTooltip(tree: ResourceListItemData = TREE, loaded = true, storeDataService: IResourceDataService = createResourceDataServiceStub()) {
	const cardBody = { ...createTestCardBody([createProperty('rdfs:comment', [createLiteralView('A tree bearing apples')])]), subject: tree.subject };
	const documentDataService = createResourceDataServiceStub(loaded ? [cardBody] : []);
	const result = renderWebview(
		<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {}, resources: [tree], descriptionPredicates: [RdfDataFactory.namedNode(RDFS.comment)] }}>
			<span className="tree" {...getResourceTooltipAttributes(tree.subject)}>Apple tree</span>
			<span className="other" {...getResourceTooltipAttributes(RdfDataFactory.namedNode('http://x/y'), 'end')}>y</span>
			<span className="node" {...getResourceTooltipAttributes(RdfDataFactory.blankNode('b1'))}>node</span>
			<ResourceTooltip documentDataService={documentDataService} storeDataService={storeDataService} />
		</FormEditorContext.Provider>
	);

	return { ...result, documentDataService };
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
		expect(card.querySelector('.compact-card-iri')?.textContent).toBe(TREE.subject.value);
		expect(card.querySelector('.card-usage')?.textContent).toBe('3 usages');
		expect(card.querySelector('[role="button"], button')).toBeNull();
	});

	it('asks for no statements of a resource without pins', () => {
		const { container, documentDataService } = renderTooltip({ ...TREE, pins: [] }, false);

		hover(container.querySelector('.tree')!);

		expect(documentDataService.requested).toEqual([]);
	});

	it('asks for the statements its pinned properties are read from', () => {
		const { container, documentDataService } = renderTooltip({ ...TREE, pins: [{ predicate: RdfDataFactory.namedNode(RDFS.comment), scope: 'workspace' }] }, false);

		hover(container.querySelector('.tree')!);

		expect(documentDataService.requested).toEqual([TREE.subject]);
	});

	it('shows the pinned properties of a resource as items that open nothing', () => {
		const { container } = renderTooltip({ ...TREE, pins: [{ predicate: RdfDataFactory.namedNode(RDFS.comment), scope: 'workspace' }] });

		hover(container.querySelector('.tree')!);

		const item = container.querySelector('.resource-tooltip .pinned-property')!;

		expect(item.textContent).toContain('A tree bearing apples');
		expect(item.getAttribute('role')).toBeNull();
	});

	it('asks the store for a resource the document does not define, and shows its card once it comes', () => {
		const send = vi.fn();
		const storeDataService = new ResourceDataService(send);
		const other = createResourceListItem('y', { subject: RdfDataFactory.namedNode('http://x/y'), label: 'Other', typeLabels: ['Property'] });

		storeDataService.setSnapshot(1, 1);

		const { container } = renderTooltip(TREE, true, storeDataService);

		hover(container.querySelector('.other')!);
		act(() => {
			vi.advanceTimersByTime(50);
		});

		expect(send).toHaveBeenCalledWith([other.subject]);
		expect(screen.getByRole('tooltip').textContent).toBe('http://x/y');

		act(() => {
			storeDataService.accept(1, [{ subject: other.subject as NamedNode, predicates: [] }], [], [other]);
		});

		expect(screen.getByRole('tooltip').querySelector('.resource-card-label')?.textContent).toBe('Other');
		expect(screen.getByRole('tooltip').querySelector('.compact-card-types')?.textContent).toBe('Property');
	});

	it('never asks the store for a resource of the document', () => {
		const storeDataService = createResourceDataServiceStub();
		const { container } = renderTooltip(TREE, true, storeDataService);

		hover(container.querySelector('.tree')!);

		expect(storeDataService.requested).toEqual([]);
	});

	it('shows only the IRI of a resource neither the document nor the store describes', () => {
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

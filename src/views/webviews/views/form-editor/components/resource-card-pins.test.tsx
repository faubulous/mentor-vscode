// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RDFS, XSD } from '@faubulous/mentor-rdf';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { TEST_NAMESPACES, createIriView, createLiteralView, createProperty, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PinnedProperty, ResourceSummary } from '../form-editor-model';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';

const EX = TEST_NAMESPACES.ex;

/**
 * The pins of the card: a resource pinned for everyone, a number and the comment pinned for oneself.
 */
const PINS: PinnedProperty[] = [
	{ predicate: RdfDataFactory.namedNode(`${EX}p`), scope: 'workspace' },
	{ predicate: RdfDataFactory.namedNode(`${EX}count`), scope: 'user' },
	{ predicate: RdfDataFactory.namedNode(RDFS.comment), scope: 'workspace' },
	{ predicate: RdfDataFactory.namedNode(`${EX}missing`), scope: 'workspace' }
];

/**
 * The statements of the resource of the card.
 */
const DETAIL = createTestResourceDetail([
	createProperty('rdfs:label', [createLiteralView('Apple tree')]),
	createProperty('ex:p', [createIriView('ex:A', 'A')]),
	createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }]),
	createProperty('rdfs:comment', [createLiteralView('A tree bearing apples')])
]);

/**
 * Render the card of the resource with the pins given, recording the callbacks of the form.
 * @param summary What the summary adds or replaces.
 * @param expanded Whether the card is expanded.
 * @param loaded Whether the statements of the resource are at hand.
 */
function renderCard(summary: Partial<ResourceSummary> = {}, expanded = false, loaded = true) {
	const onToggle = vi.fn();
	const onSetPin = vi.fn();
	const resource = createResourceSummary('Tree', { term: DETAIL.term, label: 'Apple tree', description: 'A tree bearing apples', typeIri: `${EX}Tree`, pins: PINS, ...summary });
	const dataService = createResourceDataServiceStub(loaded ? [DETAIL] : []);
	const context: FormEditorContextValue = {
		readOnly: true,
		namespaces: [],
		languageTags: {},
		labelPredicates: [RdfDataFactory.namedNode(RDFS.label)],
		descriptionPredicates: [RdfDataFactory.namedNode(RDFS.comment)],
		pinScopes: ['user', 'workspace'],
		onSetPin
	};

	const result = renderWebview(
		<FormEditorContext.Provider value={context}>
			<ResourceCard summary={resource} dataService={dataService} expanded={expanded} onToggle={onToggle} />
		</FormEditorContext.Provider>
	);

	return { ...result, onToggle, onSetPin, dataService, resource };
}

describe('ResourceCard, its pins', () => {
	it('asks for the statements of a collapsed card with pins', () => {
		const { dataService } = renderCard({}, false, false);

		expect(dataService.requested).toEqual([DETAIL.term]);
	});

	it('shows the pinned properties a collapsed card has as fields, the description among them', () => {
		const { container } = renderCard();
		const fields = Array.from(container.querySelectorAll<HTMLElement>('.pinned-property'));

		expect(fields.map(field => field.querySelector('.pinned-property-caption')?.textContent)).toEqual(['ex:p', 'ex:count', 'rdfs:comment']);
		expect(fields[0].querySelector('.value-pill-label')?.textContent).toBe('A');
		expect(fields[1].querySelector('.pinned-property-value.is-numeric')?.textContent).toBe('42');
		expect(fields[1].querySelector('.pinned-property-caption vscode-icon')?.getAttribute('title')).toBe('Pinned for you');
		expect(fields[2].classList.contains('is-description')).toBe(true);
		expect(container.querySelector('.resource-card-description')).toBeNull();
	});

	it('asks for nothing and keeps the description of a collapsed card without pins', () => {
		const { container, dataService } = renderCard({ pins: undefined }, false, false);

		expect(dataService.requested).toEqual([]);
		expect(container.querySelector('.pinned-properties-list')).toBeNull();
		expect(container.querySelector('.resource-card-description')?.textContent).toBe('A tree bearing apples');
	});

	it('expands the card from a pinned field, with the pointer and the keyboard', async () => {
		const { container, onToggle, resource } = renderCard();
		const field = container.querySelector<HTMLElement>('.pinned-property')!;

		await userEvent.click(field);
		fireEvent.keyDown(field, { key: 'Enter' });

		expect(onToggle.mock.calls).toEqual([[resource.term], [resource.term]]);
	});

	it('offers to pin the properties of an expanded card but its type, and pins and unpins them from the menu', async () => {
		const { onSetPin, resource } = renderCard({}, true);
		const row = screen.getByRole('group', { name: 'ex:p' });
		const menu = row.querySelector('vscode-context-menu')!;

		expect(within(row).getByRole('button', { name: 'ex:p: pinned for everyone' })).toBeTruthy();
		expect(within(screen.getByRole('group', { name: 'ex:count' })).getByRole('button', { name: 'ex:count: pinned for you' })).toBeTruthy();

		await act(async () => {
			menu.dispatchEvent(new CustomEvent('vsc-context-menu-select', { detail: { value: 'user' } }));
			menu.dispatchEvent(new CustomEvent('vsc-context-menu-select', { detail: { value: 'unpin' } }));
		});

		expect(onSetPin.mock.calls).toEqual([
			[resource.term, RdfDataFactory.namedNode(`${EX}p`), 'user'],
			[resource.term, RdfDataFactory.namedNode(`${EX}p`), undefined]
		]);
	});

	it('offers no pin for a resource of no known type', () => {
		renderCard({ pins: undefined }, true);

		expect(within(screen.getByRole('group', { name: 'ex:p' })).queryByRole('button', { name: /pin/i })).toBeNull();
	});
});

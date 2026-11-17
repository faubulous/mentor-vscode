import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render, within } from '@testing-library/react';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceListItem } from '@src/utilities/mocks/resource-list-item-fixtures';
import { EXAMPLE_NAMESPACE, createLiteralView, createProperty, createTestCardBody } from '@src/utilities/mocks/statement-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PinnedProperty } from '../form-editor-model';
import { FormEditorContext } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';

/**
 * Render an expanded card whose blank node has several rows, each with a pin.
 * @param pins The pins of the blank node.
 */
function renderCard(pins: PinnedProperty[] = []) {
	const node = RdfDataFactory.blankNode('b1');
	const nodeStatements = {
		subject: node,
		predicates: ['ex:q', 'ex:r', 'ex:s'].map(predicate => createProperty(predicate, [createLiteralView(`value of ${predicate}`)]))
	};
	const nodeSummary = createResourceListItem('b1', { subject: node, pins });
	const cardBody = createTestCardBody([createProperty('ex:p', [{ term: node, editable: false, nested: { term: node, propertyCount: 3 } }])]);
	const listItem = createResourceListItem('Tree', { subject: cardBody.subject, pins: [] });

	render(
		<div className="form-editor" style={{ height: 'auto', overflow: 'visible', '--form-context-bar-height': '0px', '--form-toolbar-height': '0px' } as React.CSSProperties}>
			<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {}, labelPredicates: [], pinScopes: ['user', 'workspace'], onSetPin: vi.fn() }}>
				<div className="form-block is-resource" style={{ width: 1000 }}>
					<ResourceCard cardHeader={listItem} dataService={createResourceDataServiceStub([cardBody, nodeStatements], [nodeSummary])} expanded onToggle={() => undefined} />
				</div>
			</FormEditorContext.Provider>
		</div>
	);

	return document.querySelector<HTMLElement>('.resource-card.is-nested')!;
}

describe('RowMenu, in a browser', () => {
	it('opens its menu over the rows after it in a nested card, with only the choices the pin can switch to', async () => {
		const box = renderCard();

		await userEvent.click(within(box).getByRole('button', { name: 'Expand' }));

		const row = within(box).getByRole('group', { name: 'ex:q' });

		await userEvent.hover(row);
		await userEvent.click(within(row).getByRole('button', { name: 'More actions for ex:q' }));

		const menu = row.querySelector<HTMLElement & { show: boolean }>('.row-menu vscode-context-menu')!;

		await expect.poll(() => menu.show).toBe(true);

		const labels = Array.from(menu.shadowRoot?.querySelectorAll('vscode-context-menu-item') ?? []).map(item => item.getAttribute('label'));
		const items = Array.from(menu.shadowRoot!.querySelectorAll('vscode-context-menu-item'));
		const rect = items[items.length - 1].getBoundingClientRect();
		const top = document.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 2);

		expect(labels).toEqual(['Pin for me', 'Pin for everyone']);
		expect(top === menu || menu.contains(top)).toBe(true);
	});

	it('shows the pin of a pinned property in the gutter of its row at rest, and the ⋮ button in its place while the pointer is in the row', async () => {
		const box = renderCard([{ predicate: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}q`), scope: 'workspace' }]);

		await userEvent.click(within(box).getByRole('button', { name: 'Expand' }));

		const row = within(box).getByRole('group', { name: 'ex:q' });
		const pin = row.querySelector<HTMLElement>('.row-menu-pin')!;
		const button = row.querySelector<HTMLElement>('.row-menu > .icon-button')!;
		const centreOf = (element: Element): number => Math.round(element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2);

		expect(getComputedStyle(pin).visibility).toBe('visible');
		expect(getComputedStyle(button).visibility).toBe('hidden');
		expect(centreOf(pin)).toBe(centreOf(button));

		await userEvent.hover(row);

		expect(getComputedStyle(pin).visibility).toBe('hidden');
		expect(getComputedStyle(button).visibility).toBe('visible');
	});

	it('keeps the chevron and the ⋮ of the card as far from its sides as from its top, with the ⋮ of a row under the ⋮ of the card', async () => {
		renderCard();

		const card = document.querySelector<HTMLElement>('.resource-card:not(.is-nested)')!;
		const bounds = card.getBoundingClientRect();
		const chevron = within(card).getAllByRole('button', { name: 'Collapse' })[0].getBoundingClientRect();
		const cardMenu = card.querySelector('.resource-card-menu .icon-button')!.getBoundingClientRect();
		const rowMenu = card.querySelector(':scope > .resource-card-body .statement-line .row-menu')!.getBoundingClientRect();
		const centreOf = (rect: DOMRect): number => Math.round(rect.left + rect.width / 2);

		expect(Math.round(chevron.left - bounds.left - card.clientLeft)).toBe(Math.round(chevron.top - bounds.top - card.clientTop));
		expect(Math.round(bounds.right - card.clientLeft - cardMenu.right)).toBe(Math.round(chevron.left - bounds.left - card.clientLeft));
		expect(centreOf(rowMenu)).toBe(centreOf(cardMenu));
	});
});

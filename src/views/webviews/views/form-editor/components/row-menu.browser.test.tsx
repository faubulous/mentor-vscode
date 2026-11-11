import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render, within } from '@testing-library/react';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { createLiteralView, createProperty, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { FormEditorContext } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';

/**
 * Render an expanded card whose blank node has several rows, each with a pin.
 */
function renderCard() {
	const node = RdfDataFactory.blankNode('b1');
	const nodeDetail = {
		term: node,
		properties: ['ex:q', 'ex:r', 'ex:s'].map(predicate => createProperty(predicate, [createLiteralView(`value of ${predicate}`)])),
		pins: []
	};
	const detail = createTestResourceDetail([createProperty('ex:p', [{ term: node, editable: false, nested: { term: node, propertyCount: 3 } }])]);
	const summary = createResourceSummary('Tree', { term: detail.term, pins: [] });

	render(
		<div className="form-editor" style={{ height: 'auto', overflow: 'visible' }}>
			<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {}, labelPredicates: [], pinScopes: ['user', 'workspace'], onSetPin: vi.fn() }}>
				<div className="form-block is-resource" style={{ width: 1000 }}>
					<ResourceCard summary={summary} dataService={createResourceDataServiceStub([detail, nodeDetail])} expanded onToggle={() => undefined} />
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
});

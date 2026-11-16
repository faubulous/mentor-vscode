import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render, within } from '@testing-library/react';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceListItem } from '@src/utilities/mocks/resource-list-item-fixtures';
import { TEST_NAMESPACES, createLiteralView, createProperty, createTestCardBody, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext } from '../state/form-editor-context';
import { ResourceCard } from '../components/resource-card';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));

/**
 * A menu element with its visibility.
 */
type MenuElement = HTMLElement & { show: boolean };

/**
 * Render an expanded, edited card with a label and a blank node, whose nested card is expanded and
 * has rows of its own.
 * @returns The card and its nested card.
 */
async function renderCard(): Promise<{ card: HTMLElement; nested: HTMLElement }> {
	const node = RdfDataFactory.blankNode('b1');
	const nodeCardBody = withAnchors({ subject: node, predicates: ['rdfs:label', 'rdfs:comment', 'rdfs:seeAlso'].map(predicate => createProperty(predicate, [createLiteralView(`value of ${predicate}`)])) });
	const nodeSummary = createResourceListItem('b1', { subject: node, pins: [] });
	const cardBody = withAnchors(createTestCardBody([
		createProperty('rdfs:label', [createLiteralView('Tree')]),
		createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 3 } }])
	]));
	const listItem = createResourceListItem('Tree', { subject: cardBody.subject, pins: [] });
	const editing = new EditingController(createEditingHostStub());

	render(
		<div className="form-editor" style={{ height: 'auto', overflow: 'visible' }}>
			<FormEditorContext.Provider value={{ readOnly: false, editing, namespaces: NAMESPACES, languageTags: {}, resources: [], onRemoveResource: () => undefined }}>
				<div className="form-block is-resource" style={{ width: 1000 }}>
					<ResourceCard cardHeader={listItem} dataService={createResourceDataServiceStub([cardBody, nodeCardBody], [nodeSummary])} expanded onToggle={() => undefined} />
				</div>
			</FormEditorContext.Provider>
		</div>
	);

	const card = document.querySelector<HTMLElement>('.resource-card:not(.is-nested)')!;
	const nested = card.querySelector<HTMLElement>('.resource-card.is-nested')!;

	await userEvent.click(within(nested).getByRole('button', { name: 'Expand' }));
	await expect.poll(() => nested.querySelectorAll('.statement-line:not(.is-card-header)').length).toBe(3);

	return { card, nested };
}

/**
 * Click an element, found by an id of its own, as the text a locator would go by changes with the
 * menus that open.
 * @param target The element.
 * @param options The button and the point within the element.
 */
async function clickOn(target: HTMLElement, options: { button?: 'left' | 'right'; position?: { x: number; y: number } } = {}): Promise<void> {
	target.dataset.testid = 'click-target';

	try {
		await page.getByTestId('click-target').click(options);
	} finally {
		delete target.dataset.testid;
	}
}

/**
 * The menus that are open.
 * @returns The menus.
 */
function openMenus(): MenuElement[] {
	return Array.from(document.querySelectorAll<MenuElement>('vscode-context-menu')).filter(menu => menu.show);
}

/**
 * Right-click an element at a point within it, after closing every menu, and tell where the
 * pointer was, as the right-click reports it, and where the visible box of the menu that opened is
 * once the page has settled.
 * @param target The element to right-click.
 * @param x The horizontal offset of the point in the element.
 * @param y The vertical offset of the point in the element.
 * @returns The point in the viewport and the box of the open menu.
 */
async function rightClick(target: HTMLElement, x: number, y: number): Promise<{ pointer: { x: number; y: number }; menu: DOMRect }> {
	const menus = Array.from(document.querySelectorAll<MenuElement>('vscode-context-menu'));

	for (const menu of menus) {
		menu.show = false;
	}

	await Promise.all(menus.map(menu => (menu as MenuElement & { updateComplete: Promise<unknown> }).updateComplete));

	let pointer = { x: Number.NaN, y: Number.NaN };
	const record = (event: MouseEvent) => {
		pointer = { x: event.clientX, y: event.clientY };
	};

	document.addEventListener('contextmenu', record, { capture: true });

	try {
		await clickOn(target, { button: 'right', position: { x, y } });
	} finally {
		document.removeEventListener('contextmenu', record, { capture: true });
	}

	await expect.poll(() => openMenus().length).toBe(1);
	await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

	return { pointer, menu: openMenus()[0].shadowRoot!.querySelector('.context-menu')!.getBoundingClientRect() };
}

/**
 * The edited rows of a card, leaving out those of the cards nested in it.
 * @param card The card.
 * @returns The rows.
 */
function _ownRowsOf(card: HTMLElement): HTMLElement[] {
	return Array.from(card.querySelectorAll<HTMLElement>('.statement-line.is-editable')).filter(row => row.closest('.resource-card') === card);
}

/**
 * The actions column of a row, the part of an edited row that is not a text field, whose right-click
 * keeps the menu of the browser.
 * @param row The row.
 * @returns The actions column.
 */
function _actionsOf(row: HTMLElement): HTMLElement {
	return row.querySelector<HTMLElement>(':scope > .statement-actions')!;
}

describe('useContextMenu, in a browser', () => {
	it.each([
		['the title bar of the card', (card: HTMLElement) => card.querySelector<HTMLElement>('.resource-card-title-bar')!, 'middle'],
		['the actions of a row of the card', (card: HTMLElement) => _actionsOf(_ownRowsOf(card).slice(-1)[0]), 'middle'],
		['the header of the nested card', (_card: HTMLElement, nested: HTMLElement) => nested.querySelector<HTMLElement>('.statement-line.is-card-header')!, 'middle'],
		['the actions of a row of the nested card', (_card: HTMLElement, nested: HTMLElement) => _actionsOf(_ownRowsOf(nested)[1]), 'middle'],
		['the gutter of the nested card', (_card: HTMLElement, nested: HTMLElement) => nested, 'left']
	] as const)('opens the menu at the pointer on a right-click on %s', async (_name, targetOf, column) => {
		const { card, nested } = await renderCard();
		const target = targetOf(card, nested);
		const { width, height } = target.getBoundingClientRect();
		const x = column === 'left' ? 2 : Math.round(width / 2);

		for (const y of [2, Math.round(height / 2)]) {
			const { pointer, menu } = await rightClick(target, x, y);

			expect(Math.abs(menu.left - pointer.x)).toBeLessThanOrEqual(1);
			expect(Math.abs(menu.top - pointer.y)).toBeLessThanOrEqual(1);
		}
	});

	it('opens the menu to the left of the pointer where it would run past the right edge of the view', async () => {
		const { nested } = await renderCard();
		const width = document.documentElement.clientWidth;

		document.querySelector<HTMLElement>('.form-block')!.style.width = `${width - 20}px`;
		await new Promise(resolve => requestAnimationFrame(resolve));

		const header = nested.querySelector<HTMLElement>('.statement-line.is-card-header')!;
		const { pointer, menu } = await rightClick(header, header.getBoundingClientRect().width - 60, 8);

		expect(menu.right).toBeLessThanOrEqual(width);
		expect(Math.abs(menu.right - pointer.x)).toBeLessThanOrEqual(1);
	});

	it('keeps one menu open: a right-click elsewhere closes the menu its ⋮ button opened', async () => {
		const { card, nested } = await renderCard();
		const cardMenu = card.querySelector<MenuElement>('.resource-card-menu vscode-context-menu')!;

		await clickOn(card.querySelector<HTMLElement>('.resource-card-menu .icon-button')!);
		await expect.poll(() => openMenus()).toEqual([cardMenu]);

		await clickOn(nested.querySelector<HTMLElement>('.statement-line.is-card-header')!, { button: 'right', position: { x: 60, y: 8 } });

		await expect.poll(() => openMenus()).toEqual([nested.querySelector('.nested-card-menu vscode-context-menu')]);
	});

	it('closes the open menu on a right-click in a text field, which keeps the menu of the browser', async () => {
		const { card, nested } = await renderCard();

		await clickOn(card.querySelector<HTMLElement>('.resource-card-menu .icon-button')!);
		await expect.poll(() => openMenus().length).toBe(1);

		await clickOn(within(_ownRowsOf(nested)[1]).getByLabelText('Value 1'), { button: 'right' });

		await expect.poll(() => openMenus().length).toBe(0);
	});

	it('opens a menu from its ⋮ button at once after a right-click closed it', async () => {
		const { card, nested } = await renderCard();
		const cardMenu = card.querySelector<MenuElement>('.resource-card-menu vscode-context-menu')!;
		const button = card.querySelector<HTMLElement>('.resource-card-menu .icon-button')!;

		await clickOn(button);
		await expect.poll(() => openMenus()).toEqual([cardMenu]);

		await clickOn(nested.querySelector<HTMLElement>('.statement-line.is-card-header')!, { button: 'right', position: { x: 60, y: 8 } });
		await expect.poll(() => openMenus()).toEqual([nested.querySelector('.nested-card-menu vscode-context-menu')]);

		await clickOn(button);

		await expect.poll(() => openMenus()).toEqual([cardMenu]);
		await new Promise(resolve => setTimeout(resolve, 200));
		expect(openMenus()).toEqual([cardMenu]);
	});
});

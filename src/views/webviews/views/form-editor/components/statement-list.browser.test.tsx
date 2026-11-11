import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { act, render, within } from '@testing-library/react';
import { OWL, RDF, RDFS, XSD } from '@faubulous/mentor-rdf';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, TEST_SUBJECT, createLiteralView, createProperty, createSampleResourceDetail, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { ResourceDetail } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext } from '../state/form-editor-context';
import { StatementList } from './statement-list';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));
const SAMPLE = withAnchors(createSampleResourceDetail());
const RESOURCES = [createResourceSummary('Plant', { label: 'Plant' }), createResourceSummary('Shrub', { label: 'Shrub' })];

/**
 * Render the edited statements of a detail in the form editor, written through a controller over
 * a recording host.
 * @param detail The detail.
 * @param others The details of the blank nodes it shows.
 * @param resources The resources of the document.
 */
async function renderList(detail: ResourceDetail = SAMPLE, others: ResourceDetail[] = [], resources = RESOURCES, width = 1000) {
	const host = createEditingHostStub();
	const editing = new EditingController(host);
	const dataService = createResourceDataServiceStub([detail, ...others]);
	const ui = (current: ResourceDetail) => (
		<div className="form-editor" style={{ height: 'auto', overflow: 'visible' }}>
			<FormEditorContext.Provider value={{ readOnly: false, editing, namespaces: NAMESPACES, languageTags: {}, resources }}>
				<article className="resource-card is-expanded" style={{ width }}>
					<div className="resource-card-body">
						<StatementList detail={current} dataService={dataService} depth={0} visited={[current.term]} />
					</div>
				</article>
			</FormEditorContext.Provider>
			<button type="button" className="outside">Outside</button>
		</div>
	);
	const result = render(ui(detail));

	await Promise.all(Array.from(result.container.querySelectorAll('vscode-textfield')).map(field => (field as unknown as { updateComplete: Promise<unknown> }).updateComplete));

	/**
	 * Deliver the detail for the next version, as the host does after an applied edit.
	 */
	const deliver = async (next: ResourceDetail) => {
		dataService.version++;
		await act(async () => result.rerender(ui(next)));
	};

	return { ...result, host, deliver };
}

/**
 * Move the focus out of the list, to a button after it.
 */
async function leaveList(): Promise<void> {
	await act(async () => userEvent.click(document.querySelector<HTMLElement>(".outside")!));
}

/**
 * The rows of the list, in order.
 */
function rows(): HTMLElement[] {
	return Array.from(document.querySelectorAll<HTMLElement>('.statement-line'));
}

/**
 * The labels of the pills of a row.
 */
function pillsOf(row: HTMLElement): string[] {
	return Array.from(row.querySelectorAll('.value-pill-label')).map(label => label.textContent ?? '');
}

describe('StatementList, edited in a browser', () => {
	it('writes an edited literal when the focus is tabbed out of its row', async () => {
		const { host } = await renderList();

		await userEvent.click(within(rows()[1]).getByLabelText('Value 1'));
		await userEvent.keyboard('{End}s');
		await leaveList();

		expect(host.submitted.map(edit => edit.operations[0])).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: RdfDataFactory.literal('Trees', 'en') }] }]);
	});

	it('adds a typed resource as a pill and offers the resources of the document', async () => {
		await renderList();

		const row = rows()[2];

		await userEvent.click(within(row).getByLabelText('New value'));
		await userEvent.keyboard('shr');

		expect(Array.from(row.querySelectorAll('.combobox-option-label')).map(option => option.textContent)).toEqual(['Shrub']);

		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard('ex:Tree{Enter}');

		expect(pillsOf(row)).toEqual(['Thing', 'Shrub', 'ex:Tree']);
	});

	it('walks and removes the pills with the keys, and types on a pill into the input', async () => {
		await renderList();

		const row = rows()[2];
		const input = within(row).getByLabelText('New value');

		await userEvent.click(input);
		await userEvent.keyboard('ex:Plant{Enter}');
		await userEvent.keyboard('{ArrowLeft}');

		expect(document.activeElement?.getAttribute('aria-label')).toBe('Plant');

		await userEvent.keyboard('{ArrowLeft}{Delete}');

		expect(pillsOf(row)).toEqual(['Plant']);

		await userEvent.keyboard('{ArrowLeft}x');

		expect(document.activeElement).toBe(input);
		expect((input as unknown as { value: string }).value).toBe('x');
	});

	it('changes the language of a literal with the tag picker', async () => {
		const { host } = await renderList();

		await userEvent.click(within(rows()[1]).getByRole('button', { name: /^en\./ }));
		await userEvent.keyboard('de{Enter}');

		expect(within(rows()[1]).getByRole('button', { name: /^de\./ })).toBeTruthy();

		await leaveList();

		expect(host.submitted[0].operations[0]).toEqual({ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: RdfDataFactory.literal('Tree', 'de') }] });
	});

	it('offers the datatypes a number fits', async () => {
		const detail = withAnchors(createTestResourceDetail([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));

		await renderList(detail);
		await userEvent.click(within(rows()[0]).getByRole('button', { name: /^Integer\./ }));

		expect(Array.from(rows()[0].querySelectorAll('.combobox-option-label')).map(option => option.textContent)).toEqual([]);

		await userEvent.keyboard('{ArrowDown}');

		expect(Array.from(rows()[0].querySelectorAll('.combobox-option-label')).map(option => option.textContent)).toEqual(['Text', 'Integer', 'Decimal', 'Double', 'Float', 'Markdown']);
	});

	it('steps a whole number with the arrows', async () => {
		const detail = withAnchors(createTestResourceDetail([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));
		const field = (await renderList(detail), within(rows()[0]).getByLabelText('Value 1'));

		await userEvent.click(field);
		await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}');

		expect((field as unknown as { value: string }).value).toBe('43');
	});

	it('shows why a number does not fit its datatype in place of its tag, and writes nothing', async () => {
		const detail = withAnchors(createTestResourceDetail([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));
		const { host } = await renderList(detail);

		await userEvent.click(within(rows()[0]).getByLabelText('Value 1'));
		await userEvent.keyboard('{End}.5{Enter}');

		expect(within(rows()[0]).getByRole('button', { name: /Whole numbers/ })).toBeTruthy();
		expect(host.submitted).toEqual([]);
	});

	it('draws the box of a field only on intent', async () => {
		await renderList();

		const field = within(rows()[1]).getByLabelText('Value 1');
		const border = (): string => getComputedStyle(field).getPropertyValue('--vscode-settings-textInputBorder').trim();

		expect(border()).toBe('transparent');

		await userEvent.hover(field);

		expect(border()).not.toBe('transparent');
	});

	it('leaves the focus where the user put it when the edit of the row left is applied', async () => {
		const { host, deliver } = await renderList();

		await userEvent.click(within(rows()[1]).getByLabelText('Value 1'));
		await userEvent.keyboard('{End}s');
		await userEvent.click(within(rows()[2]).getByLabelText('New value'));
		await act(async () => host.settle());
		await deliver({ ...SAMPLE, properties: SAMPLE.properties.map((property, index) => index === 1 ? { ...property, values: [{ ...property.values[0], term: RdfDataFactory.literal('Trees', 'en'), anchor: 900 }] } : property) });

		expect(host.submitted).toHaveLength(1);
		expect(rows()[2].contains(document.activeElement)).toBe(true);
		expect((within(rows()[1]).getByLabelText('Value 1') as HTMLInputElement).value).toBe('Trees');
	});

	it('adds a new statement typed into the row Add property opens, with the focus in its predicate', async () => {
		const { host } = await renderList();

		await userEvent.click(document.querySelector<HTMLElement>('.statement-list-add')!);

		const row = rows()[3];

		await expect.poll(() => document.activeElement).toBe(within(row).getByLabelText('Predicate'));
		await userEvent.keyboard('rdfs:seeAlso');
		await userEvent.click(within(row).getByLabelText('New value'));

		expect((within(row).getByLabelText('New value') as unknown as { placeholder: string }).placeholder).toBe('Add rdfs:seeAlso');

		await userEvent.keyboard('ex:Plant{Enter}');
		await leaveList();

		expect(host.submitted.map(edit => edit.operations[0])).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.seeAlso, values: [{ kind: 'term', term: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Plant`) }] }]);
	});

	it('offers the classes of the document as the type of an untyped blank node', async () => {
		const node = RdfDataFactory.blankNode('b1');
		const detail = withAnchors(createTestResourceDetail([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
		const nodeDetail = withAnchors({ term: node, properties: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });
		const resources = [
			createResourceSummary('Plant', { label: 'Plant', typeIri: OWL.Class }),
			createResourceSummary('Plank', { label: 'Plank' }),
			createResourceSummary('Planter', { label: 'Planter', typeIri: RDFS.Class })
		];

		await renderList(detail, [nodeDetail], resources);

		const header = within(document.querySelector<HTMLElement>('.resource-card.is-nested')!).getByRole('group', { name: 'Type' });

		await userEvent.click(within(header).getByRole('button', { name: 'Choose type' }));
		await expect.poll(() => document.activeElement).toBe(within(header).getByLabelText('New value'));
		await userEvent.keyboard('plan');

		expect(Array.from(header.querySelectorAll('.combobox-option-label')).map(option => option.textContent)).toEqual(['Plant', 'Planter']);
	});

	it('starts a new blank node with [, puts the focus into the input of its type, and writes it with the type', async () => {
		const { host } = await renderList();
		const row = rows()[2];

		await userEvent.click(within(row).getByLabelText('New value'));
		await userEvent.keyboard('[[');

		const card = within(row).getByRole('group', { name: 'New blank node' });

		await expect.poll(() => document.activeElement).toBe(within(card).getByLabelText('New value'));

		await userEvent.keyboard('ex:Leaf{Enter}');
		await leaveList();

		expect(host.submitted.map(edit => edit.operations[0])).toEqual([{
			op: 'setValues',
			subject: TEST_SUBJECT,
			predicate: RDFS.subClassOf,
			values: [
				{ kind: 'existing', anchor: 130 },
				{ kind: 'node', statements: [{ predicate: RDF.type, values: [{ kind: 'term', term: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Leaf`) }] }] }
			]
		}]);
	});

	it('opens the ⋯ menu of a nested card on its button and on a right-click, and duplicates the node from it', async () => {
		const node = RdfDataFactory.blankNode('b1');
		const detail = withAnchors(createTestResourceDetail([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
		const nodeDetail = withAnchors({ term: node, properties: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });
		const { host } = await renderList(detail, [nodeDetail]);
		const card = document.querySelector<HTMLElement>('.resource-card.is-nested')!;
		const menu = card.querySelector('vscode-context-menu') as HTMLElement & { show: boolean };

		await userEvent.click(within(card).getByRole('button', { name: 'More actions' }));

		expect(menu.show).toBe(true);

		await userEvent.keyboard('{Escape}');

		expect(menu.show).toBe(false);

		await userEvent.click(card.querySelector<HTMLElement>('.statement-predicate')!, { button: 'right' });
		const itemOf = (label: string) => Array.from(menu.shadowRoot?.querySelectorAll<HTMLElement>('vscode-context-menu-item') ?? []).find(item => item.getAttribute('label') === label);

		await expect.poll(() => itemOf('Duplicate')).toBeDefined();

		const duplicate = itemOf('Duplicate')!;

		await userEvent.click(duplicate);

		expect(host.submitted.map(edit => edit.operations[0])).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.comment, values: [{ kind: 'existing', anchor: 110 }, { kind: 'copy', anchor: 110 }] }]);
	});

	it('gives every row of one line the same height of 40px, whether it holds a field or pills', async () => {
		await renderList();

		expect(rows().map(row => Math.round(row.getBoundingClientRect().height))).toEqual([40, 40, 40]);
	});

	it.each([1000, 700])('lets the values of a row run to the inset of the row and a nested card to the inset of its row, in a card %ipx wide', async width => {
		const node = RdfDataFactory.blankNode('b1');
		const detail = withAnchors(createTestResourceDetail([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }]), createProperty('rdfs:label', [createLiteralView('Leaf')])]));
		const nodeDetail = withAnchors({ term: node, properties: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });

		await renderList(detail, [nodeDetail], RESOURCES, width);

		const card = document.querySelector<HTMLElement>('.resource-card:not(.is-nested)')!;
		const box = document.querySelector<HTMLElement>('.resource-card.is-nested')!;
		const rightOf = (element: Element): number => Math.round(element.getBoundingClientRect().right);
		const leftOf = (element: Element): number => Math.round(element.getBoundingClientRect().left);

		await userEvent.click(within(box).getByRole('button', { name: 'Expand' }));

		const labelRow = within(card).getAllByRole('group', { name: 'rdfs:label' }).find(row => !box.contains(row))!;

		// The card pads its rows by 8px, a row keeps a 32px inset for its pin; a nested row 54px inside its 1px border, for its pin and its remove button.
		expect(rightOf(card) - card.clientLeft - rightOf(labelRow.querySelector('.statement-values')!)).toBe(40);
		expect(rightOf(box) - rightOf(within(box).getByRole('group', { name: 'rdfs:label' }).querySelector('.statement-values')!)).toBe(55);
		// Below the reference width the nested card spans the row from the gutter: 8px card padding + 36px gutter.
		expect(leftOf(box) - leftOf(card) - card.clientLeft).toBe(width < 760 ? 44 : 44 + 160 + 20);
	});

	it('puts the predicates at 44px from the inside of the border of the card, the pills at 228px and the text of a literal at 229px', async () => {
		await renderList();

		// Measured from the inside of the border of the card.
		const card = document.querySelector<HTMLElement>('.resource-card')!;
		const left = card.getBoundingClientRect().left + card.clientLeft;
		const xOf = (element: Element | null | undefined): number => Math.round(element!.getBoundingClientRect().left - left);
		// The text of a field starts after its border and padding.
		const textOf = (field: Element | null): number => {
			const input = field!.shadowRoot!.querySelector('input')!;

			return Math.round(xOf(input) + parseFloat(getComputedStyle(input).paddingLeft));
		};

		expect(rows().map(row => textOf(row.querySelector('.statement-predicate vscode-textfield')))).toEqual([44, 44, 44]);
		expect(xOf(rows()[0].querySelector('.value-pill'))).toBe(228);
		expect(textOf(within(rows()[1]).getByLabelText('Value 1'))).toBe(229);
		expect(xOf(document.querySelector('.statement-list-add'))).toBe(44);
	});
});

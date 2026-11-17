import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { act, fireEvent, render, within } from '@testing-library/react';
import { OWL, RDF, RDFS, XSD } from '@faubulous/mentor-rdf';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceListItem } from '@src/utilities/mocks/resource-list-item-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createSampleCardBody, createTestCardBody, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { ResourceCardBodyData } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext } from '../state/form-editor-context';
import { ResourceCardFooter } from './resource-card-footer';
import { StatementList } from './statement-list';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));
const SAMPLE = withAnchors(createSampleCardBody());
const RESOURCES = [createResourceListItem('Plant', { label: 'Plant' }), createResourceListItem('Shrub', { label: 'Shrub' })];

/**
 * Render the edited statements about a resource in the form editor, written through a controller over
 * a recording host.
 * @param cardBody The statements.
 * @param others The statements about the blank nodes it shows.
 * @param resources The resources of the document.
 */
async function renderList(cardBody: ResourceCardBodyData = SAMPLE, others: ResourceCardBodyData[] = [], resources = RESOURCES, width = 1000, labelRow = false) {
	const host = createEditingHostStub();
	const editing = new EditingController(host);
	const dataService = createResourceDataServiceStub([cardBody, ...others]);
	const ui = (current: ResourceCardBodyData) => (
		<div className="form-editor" style={{ height: 'auto', overflow: 'visible' }}>
			<FormEditorContext.Provider value={{ readOnly: false, editing, namespaces: NAMESPACES, languageTags: {}, resources, labelPredicates: labelRow ? [RdfDataFactory.namedNode(RDFS.label)] : undefined }}>
				<article className="resource-card is-expanded" style={{ width }}>
					<div className="resource-card-body">
						<StatementList cardBody={current} dataService={dataService} depth={0} visited={[current.subject]} labelRow={labelRow} />
					</div>
					<ResourceCardFooter cardHeader={createResourceListItem('Tree', { subject: current.subject })} expanded />
				</article>
			</FormEditorContext.Provider>
			<button type="button" className="outside">Outside</button>
		</div>
	);
	const result = render(ui(cardBody));

	await Promise.all(Array.from(result.container.querySelectorAll('vscode-textfield')).map(field => (field as unknown as { updateComplete: Promise<unknown> }).updateComplete));

	/**
	 * Deliver the statements for the next version, as the host does after an applied edit.
	 */
	const deliver = async (next: ResourceCardBodyData) => {
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
 * Where the text of the IRI in the footer of a card starts, from the inside of the border of the card.
 * @param card The card.
 * @returns The offset.
 */
function iriTextOf(card: HTMLElement): number {
	const text = card.querySelector('.resource-card-iri-text')!;

	return Math.round(text.getBoundingClientRect().left + parseFloat(getComputedStyle(text).paddingLeft) - card.getBoundingClientRect().left - card.clientLeft);
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
		const cardBody = withAnchors(createTestCardBody([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));

		await renderList(cardBody);
		await userEvent.click(within(rows()[0]).getByRole('button', { name: /^Integer\./ }));

		expect(Array.from(rows()[0].querySelectorAll('.combobox-option-label')).map(option => option.textContent)).toEqual([]);

		await userEvent.keyboard('{ArrowDown}');

		expect(Array.from(rows()[0].querySelectorAll('.combobox-option-label')).map(option => option.textContent)).toEqual(['Text', 'Integer', 'Decimal', 'Double', 'Float', 'Markdown']);
	});

	it('steps a whole number with the arrows', async () => {
		const cardBody = withAnchors(createTestCardBody([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));
		const field = (await renderList(cardBody), within(rows()[0]).getByLabelText('Value 1'));

		await userEvent.click(field);
		await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}');

		expect((field as unknown as { value: string }).value).toBe('43');
	});

	it('shows why a number does not fit its datatype in place of its tag, and writes nothing', async () => {
		const cardBody = withAnchors(createTestCardBody([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));
		const { host } = await renderList(cardBody);

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
		await deliver({ ...SAMPLE, predicates: SAMPLE.predicates.map((property, index) => index === 1 ? { ...property, values: [{ ...property.values[0], term: RdfDataFactory.literal('Trees', 'en'), anchor: 900 }] } : property) });

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
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
		const nodeCardBody = withAnchors({ subject: node, predicates: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });
		const resources = [
			createResourceListItem('Plant', { label: 'Plant', typeIri: OWL.Class }),
			createResourceListItem('Plank', { label: 'Plank' }),
			createResourceListItem('Planter', { label: 'Planter', typeIri: RDFS.Class })
		];

		await renderList(cardBody, [nodeCardBody], resources);

		const header = within(document.querySelector<HTMLElement>('.resource-card.is-nested')!).getByRole('group', { name: 'Type' });

		await userEvent.click(within(header).getByRole('button', { name: 'Expand' }));
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
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
		const nodeCardBody = withAnchors({ subject: node, predicates: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });
		const { host } = await renderList(cardBody, [nodeCardBody]);
		const card = document.querySelector<HTMLElement>('.resource-card.is-nested')!;
		const menu = card.querySelector('vscode-context-menu') as HTMLElement & { show: boolean };

		await userEvent.click(within(card).getByRole('button', { name: 'More actions' }));

		expect(menu.show).toBe(true);

		await userEvent.keyboard('{Escape}');

		expect(menu.show).toBe(false);

		await userEvent.click(card.querySelector<HTMLElement>('.statement-line.is-card-header')!, { button: 'right' });
		const itemOf = (label: string) => Array.from(menu.shadowRoot?.querySelectorAll<HTMLElement>('vscode-context-menu-item') ?? []).find(item => item.getAttribute('label') === label);

		await expect.poll(() => itemOf('Duplicate')).toBeDefined();

		const duplicate = itemOf('Duplicate')!;

		await userEvent.click(duplicate);

		expect(host.submitted.map(edit => edit.operations[0])).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.comment, values: [{ kind: 'existing', anchor: 110 }, { kind: 'copy', anchor: 110 }] }]);
	});

	it('wraps a text too long for its line in an area of three lines at rest, and shows it whole while it has the focus', async () => {
		const text = Array.from({ length: 30 }, (_, index) => `word${index}`).join(' ').repeat(4);
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [createLiteralView(text)]), createProperty('rdfs:label', [createLiteralView('Short')])]));

		await renderList(cardBody, [], RESOURCES, 600);

		const long = within(rows()[0]).getByLabelText('Value 1') as HTMLElement & { rows: number };

		await expect.poll(() => long.tagName.toLowerCase()).toBe('vscode-textarea');
		expect(long.rows).toBe(3);
		expect(within(rows()[1]).getByLabelText('Value 1').tagName.toLowerCase()).toBe('vscode-textfield');

		await userEvent.click(long);

		await expect.poll(() => (within(rows()[0]).getByLabelText('Value 1') as HTMLElement & { rows: number }).rows).toBeGreaterThan(3);
	});

	it('puts the chevron and the ⋮ of a collapsed nested card on one axis, and shows neither the type nor a request for one where it has none, its summary in their place', async () => {
		const node = RdfDataFactory.blankNode('b1');
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
		const nodeCardBody = withAnchors({ subject: node, predicates: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });

		await renderList(cardBody, [nodeCardBody]);

		const box = document.querySelector<HTMLElement>('.resource-card.is-nested')!;
		const centreOf = (element: Element): number => Math.round(element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2);

		expect(centreOf(within(box).getByRole('button', { name: 'Expand' }))).toBe(centreOf(within(box).getByRole('button', { name: 'More actions' })));
		expect(within(box).queryByRole('button', { name: 'Choose type' })).toBeNull();
		expect(box.querySelector('.statement-line.is-card-header > .statement-predicate')).toBeNull();
		expect(Math.round(box.querySelector('.nested-card-summary')!.getBoundingClientRect().left - box.getBoundingClientRect().left)).toBe(42 + 1);
	});

	it('gives every row of one line the height of the row token of a wide card, whether it holds a field or pills', async () => {
		await renderList();

		expect(rows().map(row => Math.round(row.getBoundingClientRect().height))).toEqual([32, 32, 32]);
	});

	it('starts the labels of a narrow card where the text of its IRI starts and the values after a label column as wide as the longest label, at least the label token, and puts the tag of a literal under its label', async () => {
		await renderList(SAMPLE, [], RESOURCES, 500);

		const card = document.querySelector<HTMLElement>('.resource-card')!;
		const left = card.getBoundingClientRect().left + card.clientLeft;
		const xOf = (element: Element | null): number => Math.round(element!.getBoundingClientRect().left - left);
		const label = rows()[1];

		const column = Math.round(rows()[2].querySelector('.statement-predicate')!.getBoundingClientRect().width);
		const widest = Math.max(...rows().map(row => Math.ceil(row.querySelector('.statement-predicate-sizer')!.scrollWidth)));

		// Past the column of the grips, after the inset of the text of a field.
		expect(xOf(rows()[0])).toBe(16 + 5);
		expect(xOf(rows()[0])).toBe(iriTextOf(card));
		expect(column).toBe(Math.max(88, widest));
		expect(xOf(rows()[2].querySelector('.statement-values'))).toBe(21 + column + 12);
		expect(getComputedStyle(within(label).getByText('en', { selector: '.literal-field-tag' })).display).toBe('none');
		expect(within(label).getByRole('button', { name: 'en' }).getBoundingClientRect().top).toBeGreaterThan(label.querySelector('.statement-predicate vscode-textfield')!.getBoundingClientRect().bottom - 1);
	});

	it.each([1000, 500])('lets the values of a row run to the inset of the row and a nested card to the inset of its row, in a card %ipx wide', async width => {
		const node = RdfDataFactory.blankNode('b1');
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }]), createProperty('rdfs:label', [createLiteralView('Leaf')])]));
		const nodeCardBody = withAnchors({ subject: node, predicates: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });

		await renderList(cardBody, [nodeCardBody], RESOURCES, width);

		const card = document.querySelector<HTMLElement>('.resource-card:not(.is-nested)')!;
		const box = document.querySelector<HTMLElement>('.resource-card.is-nested')!;
		const rightOf = (element: Element): number => Math.round(element.getBoundingClientRect().right);
		const leftOf = (element: Element): number => Math.round(element.getBoundingClientRect().left);

		await userEvent.click(within(box).getByRole('button', { name: 'Expand' }));

		const labelRow = within(card).getAllByRole('group', { name: 'rdfs:label' }).find(row => !box.contains(row))!;

		const inset = 10;
		const textStart = 21;

		// The values of a row end where the room its actions keep begins, in the card and in the nested card.
		expect(rightOf(card) - card.clientLeft - rightOf(labelRow.querySelector('.statement-values')!)).toBe(inset + 44);
		expect(rightOf(box) - rightOf(within(box).getByRole('group', { name: 'rdfs:label' }).querySelector('.statement-values')!)).toBe(45);
		// A narrow card gives the nested card the whole row from the start of the text of the rows, a wide one the value column.
		expect(leftOf(box) - leftOf(card) - card.clientLeft).toBe(width < 560 ? textStart : textStart + 120 + 24);
	});

	it('puts the text of the predicates of a wide card where the text of its IRI starts, past the column of the grips, and the pills and the text of a literal in the value column', async () => {
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

		// Past the column of the grips, after the inset of the text of a field.
		expect(rows().map(row => textOf(row.querySelector('.statement-predicate vscode-textfield')))).toEqual([21, 21, 21]);
		expect(iriTextOf(card)).toBe(21);
		expect(xOf(rows()[0].querySelector('.value-pill'))).toBe(169);
		expect(textOf(within(rows()[1]).getByLabelText('Value 1'))).toBe(170);
		expect(xOf(document.querySelector('.statement-list-add'))).toBe(21);
	});

	it('moves a pill dragged onto the right half of another to after it, and writes the new order', async () => {
		const { host } = await renderList(withAnchors(createTestCardBody([createProperty('rdfs:subClassOf', [createIriView('ex:A', 'A'), createIriView('ex:B', 'B'), createIriView('ex:C', 'C')])])));
		const wrapperOf = (label: string) => within(document.body).getByText(label).closest<HTMLElement>('[data-value-index]')!;
		const source = wrapperOf('A').getBoundingClientRect();
		const target = wrapperOf('C').getBoundingClientRect();

		// The pill is grabbed by its label: its ring turns into the remove button under the pointer.
		await userEvent.dragAndDrop(wrapperOf('A'), wrapperOf('C'), { sourcePosition: { x: source.width - 3, y: source.height / 2 }, targetPosition: { x: target.width - 2, y: target.height / 2 } });
		await expect.poll(() => host.submitted.length).toBe(1);

		expect(host.submitted[0].operations).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, values: [{ kind: 'existing', anchor: 120 }, { kind: 'existing', anchor: 130 }, { kind: 'existing', anchor: 110 }] }]);
	});

	it('moves a row dragged by its grip onto the lower half of another to after it, and shows the grip before the predicate field only with the pointer in the row or at the place of the grip', async () => {
		const { host } = await renderList();
		const grip = rows()[0].querySelector<HTMLElement>('.row-grip')!;
		const area = grip.parentElement!.getBoundingClientRect();

		expect(getComputedStyle(grip).visibility).toBe('hidden');

		// Pointing at the place of the grip beside the row, under the grip, shows it.
		await userEvent.hover(rows()[0], { position: { x: area.left - rows()[0].getBoundingClientRect().left + area.width / 2, y: area.height - 2 } });

		expect(getComputedStyle(grip).visibility).toBe('visible');
		expect(grip.getBoundingClientRect().right).toBeLessThanOrEqual(rows()[0].querySelector('.statement-predicate vscode-textfield')!.getBoundingClientRect().left);

		const target = rows()[2].getBoundingClientRect();

		await userEvent.dragAndDrop(grip, rows()[2], { targetPosition: { x: target.width / 2, y: target.height - 3 } });
		await expect.poll(() => host.submitted.length).toBe(1);

		expect(host.submitted[0].operations).toEqual([{ op: 'moveProperty', subject: TEST_SUBJECT, predicate: RDF.type, target: RDFS.subClassOf, placement: 'after' }]);
	});

	it('shows no focus ring on the grip of a row while the row is dragged', async () => {
		await renderList();

		const grip = rows()[2].querySelector<HTMLElement>('.row-grip')!;

		// Reached by the keyboard, from the predicate field after it, the grip shows its ring.
		await userEvent.click(rows()[2].querySelector('.statement-predicate vscode-textfield')!);
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');

		expect(document.activeElement).toBe(grip);
		expect(getComputedStyle(grip).outlineStyle).toBe('solid');

		await act(async () => {
			fireEvent.dragStart(grip, { dataTransfer: new DataTransfer() });
		});

		expect(getComputedStyle(grip).outlineStyle).toBe('none');
	});

	it('gives the grip of a row no background under the pointer', async () => {
		await renderList();

		const grip = rows()[0].querySelector<HTMLElement>('.row-grip')!;

		await userEvent.hover(rows()[0]);
		await userEvent.hover(grip);

		expect(getComputedStyle(grip).backgroundColor).toBe('rgba(0, 0, 0, 0)');
	});

	it('moves a row dropped over the label row of the card to the top, and one dropped over the link that adds a property to the bottom', async () => {
		const { host, unmount } = await renderList(SAMPLE, [], RESOURCES, 1000, true);
		const gripOf = (row: HTMLElement) => row.querySelector<HTMLElement>('.row-grip')!;
		const label = rows()[0];

		expect(label.getAttribute('aria-label')).toBe('Label');

		await userEvent.hover(rows()[2]);
		await userEvent.dragAndDrop(gripOf(rows()[2]), label, { targetPosition: { x: label.getBoundingClientRect().width / 2, y: 3 } });
		await expect.poll(() => host.submitted.length).toBe(1);

		expect(host.submitted[0].operations).toEqual([{ op: 'moveProperty', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, target: RDF.type, placement: 'before' }]);

		unmount();

		const bottom = await renderList(SAMPLE, [], RESOURCES, 1000, true);

		await userEvent.hover(rows()[1]);
		await userEvent.dragAndDrop(gripOf(rows()[1]), document.querySelector<HTMLElement>('.statement-list-add')!);
		await expect.poll(() => bottom.host.submitted.length).toBe(1);

		expect(bottom.host.submitted[0].operations).toEqual([{ op: 'moveProperty', subject: TEST_SUBJECT, predicate: RDF.type, target: RDFS.subClassOf, placement: 'after' }]);
	});
});

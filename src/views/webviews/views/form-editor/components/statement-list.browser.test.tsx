import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { act, fireEvent, render, within } from '@testing-library/react';
import { RDF, RDFS, XSD } from '@faubulous/mentor-rdf';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceListItem } from '@src/utilities/mocks/resource-list-item-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createSampleCardBody, createTestCardBody, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { createTermOption, createTermSearchStub } from '@src/utilities/mocks/term-search-fixtures';
import { ResourceCardBodyData } from '../form-editor-model';
import { ITermSearchService } from '../services/term-search-service.interface';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext } from '../state/form-editor-context';
import { ResourceCardFooter } from './resource-card-footer';
import { StatementList } from './statement-list';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));
const SAMPLE = withAnchors(createSampleCardBody());
/**
 * The page of the tests has no context bar and no toolbar, which the title bar of a card stays under.
 */
const NO_BARS = { height: 'auto', overflow: 'visible', '--form-context-bar-height': '0px', '--form-toolbar-height': '0px' } as React.CSSProperties;

/**
 * The room before a gutter and the gap after it, as wide as the room above the chevron in the title
 * bar.
 */
const GUTTER_ROOM = (36 - 28) / 2;

/**
 * Where the content of a card starts and ends, from the inside of its border: past the room before
 * the gutter, the gutter and the gap after it.
 */
const CONTENT_EDGE = GUTTER_ROOM + 28 + GUTTER_ROOM;

const RESOURCES = [createResourceListItem('Plant', { label: 'Plant' }), createResourceListItem('Shrub', { label: 'Shrub' })];

/**
 * Render the edited statements about a resource in the form editor, written through a controller over
 * a recording host.
 * @param cardBody The statements.
 * @param others The statements about the blank nodes it shows.
 * @param resources The resources of the document.
 * @param width The width of the card.
 * @param labelRow Whether the card shows a label row.
 * @param termSearch Searches the terms of the workspace the pickers offer.
 */
async function renderList(cardBody: ResourceCardBodyData = SAMPLE, others: ResourceCardBodyData[] = [], resources = RESOURCES, width = 1000, labelRow = false, termSearch?: ITermSearchService) {
	const host = createEditingHostStub();
	const editing = new EditingController(host);
	const dataService = createResourceDataServiceStub([cardBody, ...others]);
	const ui = (current: ResourceCardBodyData) => (
		<div className="form-editor" style={NO_BARS}>
			<FormEditorContext.Provider value={{ readOnly: false, editing, termSearch, namespaces: NAMESPACES, languageTags: {}, resources, labelPredicates: labelRow ? [RdfDataFactory.namedNode(RDFS.label)] : undefined }}>
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
 * The labels of the options a combobox in an element shows.
 * @param element The element.
 * @returns The labels, in order.
 */
function optionLabelsOf(element: HTMLElement): (string | null)[] {
	return Array.from(element.querySelectorAll('.combobox-option-label')).map(option => option.textContent);
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

	it('adds a typed resource as a pill and offers the resources of the workspace not among the values', async () => {
		const resources = [createTermOption(`${EXAMPLE_NAMESPACE}Shrub`, 'Shrub'), createTermOption(`${EXAMPLE_NAMESPACE}Shrubbery`, 'Shrubbery', { source: 'workspace' })];
		const termSearch = createTermSearchStub({ resource: resources });

		await renderList(SAMPLE, [], RESOURCES, 1000, false, termSearch);

		const row = rows()[2];

		await userEvent.click(within(row).getByLabelText('New value'));
		await userEvent.keyboard('shr');

		await expect.poll(() => optionLabelsOf(row)).toEqual(['Shrub', 'Shrubbery']);

		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard('shr');

		await expect.poll(() => optionLabelsOf(row)).toEqual(['Shrubbery']);

		await userEvent.keyboard('{Backspace}{Backspace}{Backspace}ex:Tree{Enter}');

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

		await userEvent.click(within(rows()[1]).getByRole('button', { name: 'Language en, change' }));
		await userEvent.keyboard('de{Enter}');

		expect(within(rows()[1]).getByRole('button', { name: 'Language de, change' })).toBeTruthy();

		await leaveList();

		expect(host.submitted[0].operations[0]).toEqual({ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: RdfDataFactory.literal('Tree', 'de') }] });
	});

	it('opens the tag picker over the text with the datatypes a number fits on offer', async () => {
		const cardBody = withAnchors(createTestCardBody([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));

		await renderList(cardBody);
		await userEvent.click(within(rows()[0]).getByRole('button', { name: 'Datatype integer, change' }));

		await expect.poll(() => optionLabelsOf(rows()[0])).toEqual(['string', 'integer', 'decimal', 'double', 'anyURI']);
		expect(getComputedStyle(rows()[0].querySelector('.tag-picker')!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
	});

	it('offers the languages and datatypes of the workspace after those the fields know, and declares the prefix of a picked datatype', async () => {
		const geo = 'http://www.opengis.net/ont/geosparql#';
		const wktLiteral = createTermOption(`${geo}wktLiteral`, 'wkt literal', { prefixedName: 'geo:wktLiteral', source: 'workspace', missingPrefix: { prefix: 'geo', namespace: geo } });
		const termSearch = createTermSearchStub({ datatype: [wktLiteral, createTermOption(XSD.integer, 'integer', { source: 'workspace' })] }, ['de', 'fr']);
		const cardBody = withAnchors(createTestCardBody([createProperty('ex:location', [{ term: RdfDataFactory.literal('POINT(1 2)'), editable: true }])]));
		const { host } = await renderList(cardBody, [], RESOURCES, 1000, false, termSearch);

		await userEvent.click(within(rows()[0]).getByLabelText('Value 1'));
		await userEvent.click(within(rows()[0]).getByRole('button', { name: 'Datatype string, change' }));

		await expect.poll(() => optionLabelsOf(rows()[0])).toEqual(['string', 'de', 'fr', 'wkt literal']);

		await userEvent.keyboard('wkt{Enter}');
		await leaveList();

		expect(host.submitted.map(edit => edit.operations)).toEqual([[
			{ op: 'declarePrefix', prefix: 'geo', namespace: geo },
			{ op: 'setValues', subject: TEST_SUBJECT, predicate: `${EXAMPLE_NAMESPACE}location`, values: [{ kind: 'term', term: RdfDataFactory.literal('POINT(1 2)', RdfDataFactory.namedNode(`${geo}wktLiteral`)) }] }
		]]);
	});

	it('steps a whole number with the arrows', async () => {
		const cardBody = withAnchors(createTestCardBody([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));
		const field = (await renderList(cardBody), within(rows()[0]).getByLabelText('Value 1'));

		await userEvent.click(field);
		await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}');

		expect((field as unknown as { value: string }).value).toBe('43');
	});

	it('shows why a number does not fit its datatype under the value, its tag and underline in the colour of errors, and writes nothing', async () => {
		const cardBody = withAnchors(createTestCardBody([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));
		const { host } = await renderList(cardBody);
		const field = within(rows()[0]).getByLabelText('Value 1');

		await userEvent.click(field);
		await userEvent.keyboard('{End}.5{Enter}');

		const problem = within(rows()[0]).getByText('Not a valid integer — expected 42');
		const tag = within(rows()[0]).getByRole('button', { name: 'Datatype integer, change' });
		const box = field.closest<HTMLElement>('.literal-field-box')!;

		expect(getComputedStyle(tag).color).toBe(getComputedStyle(problem).color);
		expect(getComputedStyle(box).getPropertyValue('--underline-accent').trim()).toBe(getComputedStyle(box).getPropertyValue('--form-error').trim());
		expect(problem.getBoundingClientRect().top).toBeGreaterThanOrEqual(field.getBoundingClientRect().bottom - 1);
		expect(host.submitted).toEqual([]);
	});

	it('puts the tag of a literal after its last character, wrapping with the text, and shows a plain string as string only while it has the focus', async () => {
		const text = Array.from({ length: 12 }, (_, index) => `word${index}`).join(' ');
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [{ term: RdfDataFactory.literal(text, 'en'), editable: true }]), createProperty('rdfs:label', [createLiteralView('Short')])]));

		await renderList(cardBody, [], RESOURCES, 600);

		const tag = within(rows()[0]).getByRole('button', { name: 'Language en, change' });
		const field = within(rows()[0]).getByLabelText('Value 1');
		const plain = within(rows()[1]).getByLabelText('Value 1');

		// The text takes two lines, and the tag stands on the second one.
		expect(field.getBoundingClientRect().height).toBeGreaterThan(40);
		expect(tag.getBoundingClientRect().top).toBeGreaterThan(field.getBoundingClientRect().top + 20);
		expect(tag.title).toBe('Language: English');
		expect(within(rows()[1]).queryByRole('button', { name: 'Datatype string, change' })).toBeNull();

		await userEvent.click(plain);

		const plainTag = within(rows()[1]).getByRole('button', { name: 'Datatype string, change' });

		// After the text of the short value, on its line.
		expect(plainTag.getBoundingClientRect().left).toBeLessThan(plain.getBoundingClientRect().left + 120);
		expect(Math.abs(plainTag.getBoundingClientRect().top - plain.getBoundingClientRect().top)).toBeLessThan(12);
	});

	it('goes on to the field of a new value with Enter, breaks the line with Shift+Enter, and removes an emptied value with Backspace', async () => {
		const { host } = await renderList();
		const field = within(rows()[1]).getByLabelText('Value 1') as HTMLTextAreaElement;

		await userEvent.click(field);
		await userEvent.keyboard('{End}{Shift>}{Enter}{/Shift}top');

		expect(field.value).toBe('Tree\ntop');

		await userEvent.keyboard('{Enter}');

		expect(document.activeElement).toBe(within(rows()[1]).getByLabelText('New value'));
		expect(host.submitted[0].operations[0]).toEqual({ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: RdfDataFactory.literal('Tree\ntop', 'en') }] });

		await userEvent.click(field);
		await userEvent.keyboard('{Control>}a{/Control}{Backspace}{Backspace}');

		expect(within(rows()[1]).queryByLabelText('Value 1')).toBeNull();
		expect(document.activeElement).toBe(within(rows()[1]).getByLabelText('New value'));
	});

	it('draws no box around a field, but an underline on the line of its row on intent, quiet when pointed at and in the accent with the focus, moving nothing', async () => {
		await renderList();

		const row = rows()[1];
		const input = within(row).getByLabelText('Value 1');
		const field = input.closest<HTMLElement>('.literal-field-box')!;
		const underline = (): string => getComputedStyle(field).getPropertyValue('--underline-accent').trim() || getComputedStyle(field).getPropertyValue('--underline-color').trim();
		const place = (): string => JSON.stringify(input.getBoundingClientRect());
		const atRest = place();

		expect(getComputedStyle(input).borderTopWidth).toBe('0px');
		expect(underline()).toBe('transparent');
		// The field reaches down to the line of its row, so its underline lies on it.
		expect(Math.round(field.getBoundingClientRect().bottom)).toBe(Math.round(row.querySelector('.statement-cells')!.getBoundingClientRect().bottom));

		await userEvent.hover(field);

		expect(underline()).not.toBe('transparent');
		expect(place()).toBe(atRest);

		await userEvent.click(field);

		expect(underline()).toBe(getComputedStyle(field).getPropertyValue('--form-accent').trim());
		expect(getComputedStyle(field).getPropertyValue('--underline-width').trim()).toBe('2px');
		expect(place()).toBe(atRest);
	});

	it('runs the line of a row from content edge to content edge, with the grip and the menu in the gutters beside it', async () => {
		await renderList();

		const card = document.querySelector<HTMLElement>('.resource-card')!;
		const left = card.getBoundingClientRect().left + card.clientLeft;
		const right = card.getBoundingClientRect().right - card.clientLeft;
		const cells = rows()[0].querySelector('.statement-cells')!.getBoundingClientRect();
		const grip = rows()[0].querySelector('.row-grip')!.getBoundingClientRect();
		const menu = rows()[0].querySelector('.row-menu')!.getBoundingClientRect();

		expect(Math.round(cells.left - left)).toBe(CONTENT_EDGE);
		expect(Math.round(right - cells.right)).toBe(CONTENT_EDGE);
		// The grip stands as far from the border as from the content, and the menu likewise on the other side.
		expect(Math.round(grip.left - left)).toBe(GUTTER_ROOM);
		expect(Math.round(cells.left - grip.right)).toBe(GUTTER_ROOM);
		expect(Math.round(menu.left - cells.right)).toBe(GUTTER_ROOM);
		expect(Math.round(right - menu.right)).toBe(GUTTER_ROOM);
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

	it('offers the predicates of the workspace in the row Add property opens, which takes a value once one is picked', async () => {
		const skos = 'http://www.w3.org/2004/02/skos/core#';
		const prefLabel = createTermOption(`${skos}prefLabel`, 'preferred label', { prefixedName: 'skos:prefLabel', source: 'workspace', missingPrefix: { prefix: 'skos', namespace: skos } });
		const termSearch = createTermSearchStub({ predicate: [prefLabel] });
		const { searched } = termSearch;
		const { host } = await renderList(SAMPLE, [], RESOURCES, 1000, false, termSearch);

		await userEvent.click(document.querySelector<HTMLElement>('.statement-list-add')!);

		const row = rows()[3];
		const value = within(row).getByLabelText('New value') as unknown as { placeholder: string; readonly: boolean };

		await expect.poll(() => within(row).queryByRole('option', { name: /preferred label/ })).not.toBeNull();
		expect(value.placeholder).toBe('Pick a property first');
		expect(value.readonly).toBe(true);

		await userEvent.keyboard('pref');
		await expect.poll(() => searched[searched.length - 1]).toBe('pref');
		await userEvent.click(within(row).getByRole('option', { name: /preferred label/ }));

		expect((within(row).getByLabelText('Predicate') as HTMLInputElement).value).toBe('skos:prefLabel');

		await userEvent.click(within(row).getByLabelText('New value'));

		expect(value.readonly).toBe(false);

		await userEvent.keyboard('ex:Plant{Enter}');
		await leaveList();

		expect(host.submitted.map(edit => edit.operations)).toEqual([[
			{ op: 'declarePrefix', prefix: 'skos', namespace: skos },
			{ op: 'setValues', subject: TEST_SUBJECT, predicate: `${skos}prefLabel`, values: [{ kind: 'term', term: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Plant`) }] }
		]]);
	});

	it('offers the classes of the workspace as the type of an untyped blank node', async () => {
		const node = RdfDataFactory.blankNode('b1');
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
		const nodeCardBody = withAnchors({ subject: node, predicates: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });
		const plant = createTermOption(`${EXAMPLE_NAMESPACE}Plant`, 'Plant');
		const termSearch = createTermSearchStub({
			class: [plant, createTermOption(`${EXAMPLE_NAMESPACE}Planter`, 'Planter', { source: 'declared' })],
			resource: [plant, createTermOption(`${EXAMPLE_NAMESPACE}Plank`, 'Plank')]
		});

		await renderList(cardBody, [nodeCardBody], RESOURCES, 1000, false, termSearch);

		const header = within(document.querySelector<HTMLElement>('.resource-card.is-nested')!).getByRole('group', { name: 'Type' });

		await userEvent.click(within(header).getByRole('button', { name: 'Expand' }));
		await userEvent.click(within(header).getByRole('button', { name: 'Choose type' }));
		await expect.poll(() => document.activeElement).toBe(within(header).getByLabelText('New value'));
		await userEvent.keyboard('plan');

		await expect.poll(() => optionLabelsOf(header)).toEqual(['Plant', 'Planter']);
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

	it('cuts a text too long for its card after three lines at rest, its tag over the end of the last one, and shows it whole while it has the focus', async () => {
		const text = Array.from({ length: 30 }, (_, index) => `word${index}`).join(' ').repeat(4);
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [{ term: RdfDataFactory.literal(text, 'en'), editable: true }]), createProperty('rdfs:label', [createLiteralView('Short')])]));

		await renderList(cardBody, [], RESOURCES, 600);

		const long = within(rows()[0]).getByLabelText('Value 1');
		const tag = within(rows()[0]).getByRole('button', { name: 'Language en, change' });

		await expect.poll(() => Math.round(long.getBoundingClientRect().height)).toBe(3 * 26);
		expect(Math.round(within(rows()[1]).getByLabelText('Value 1').getBoundingClientRect().height)).toBe(26);
		// The tag stays in view, on the last line shown.
		expect(tag.getBoundingClientRect().bottom).toBeLessThanOrEqual(long.getBoundingClientRect().bottom);
		expect(tag.getBoundingClientRect().top).toBeGreaterThan(long.getBoundingClientRect().top + 2 * 26 - 4);

		await userEvent.click(long);

		await expect.poll(() => long.getBoundingClientRect().height).toBeGreaterThan(3 * 26);
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
		expect(box.querySelector('.statement-line.is-card-header > .statement-cells > .statement-predicate')).toBeNull();
		// Past the padding of the box, its gutter and the gap after it, inside its border.
		expect(Math.round(box.querySelector('.nested-card-summary')!.getBoundingClientRect().left - box.getBoundingClientRect().left)).toBe(1 + CONTENT_EDGE);
	});

	it('gives every row of one line the height of the row token of a wide card, whether it holds a field or pills', async () => {
		await renderList();

		expect(rows().map(row => Math.round(row.getBoundingClientRect().height))).toEqual([32, 32, 32]);
	});

	it('stacks the predicate of a row of a narrow card above its values, both at the content edge, where the text of its IRI starts', async () => {
		await renderList(SAMPLE, [], RESOURCES, 500);

		const card = document.querySelector<HTMLElement>('.resource-card')!;
		const left = card.getBoundingClientRect().left + card.clientLeft;
		const xOf = (element: Element | null): number => Math.round(element!.getBoundingClientRect().left - left);
		const label = rows()[1];

		expect(xOf(rows()[0].querySelector('.statement-cells'))).toBe(CONTENT_EDGE);
		expect(iriTextOf(card)).toBe(CONTENT_EDGE);
		expect(xOf(rows()[2].querySelector('.statement-values'))).toBe(CONTENT_EDGE);
		expect(rows()[2].querySelector('.statement-values')!.getBoundingClientRect().top).toBeGreaterThanOrEqual(rows()[2].querySelector('.statement-predicate')!.getBoundingClientRect().bottom - 1);
		expect(getComputedStyle(within(label).getByText('en', { selector: '.literal-field-tag' })).display).not.toBe('none');
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


		// The values of a row end at the content edge, in the card and in the box, inside its border.
		expect(rightOf(card) - card.clientLeft - rightOf(labelRow.querySelector('.statement-values')!)).toBe(CONTENT_EDGE);
		expect(rightOf(box) - rightOf(within(box).getByRole('group', { name: 'rdfs:label' }).querySelector('.statement-values')!)).toBe(1 + CONTENT_EDGE);
		// A narrow card gives the box the whole row from the content edge, a wide one the value column.
		expect(leftOf(box) - leftOf(card) - card.clientLeft).toBe(width < 560 ? CONTENT_EDGE : CONTENT_EDGE + 160 + 24);
	});

	it('puts the text of the predicates of a wide card at the content edge, where the text of its IRI starts, and every kind of value at the edge of the value column', async () => {
		await renderList();

		// Measured from the inside of the border of the card.
		const card = document.querySelector<HTMLElement>('.resource-card')!;
		const left = card.getBoundingClientRect().left + card.clientLeft;
		const xOf = (element: Element | null | undefined): number => Math.round(element!.getBoundingClientRect().left - left);
		// The text of a field starts after its border and padding.
		const textOf = (field: Element | null): number => {
			const input = field!.shadowRoot?.querySelector('input') ?? field!;

			return Math.round(xOf(input) + parseFloat(getComputedStyle(input).paddingLeft));
		};

		// The values past the predicate column and the gap after it.
		expect(rows().map(row => textOf(row.querySelector('.statement-predicate vscode-textfield')))).toEqual([CONTENT_EDGE, CONTENT_EDGE, CONTENT_EDGE]);
		expect(iriTextOf(card)).toBe(CONTENT_EDGE);
		expect(xOf(rows()[0].querySelector('.value-pill'))).toBe(CONTENT_EDGE + 160 + 24);
		expect(textOf(within(rows()[1]).getByLabelText('Value 1'))).toBe(CONTENT_EDGE + 160 + 24);
		expect(xOf(document.querySelector('.statement-list-add'))).toBe(CONTENT_EDGE);
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
		// The box of the predicate field reaches out by the inset of its text; its underline starts at the content edge.
		expect(grip.getBoundingClientRect().right).toBeLessThanOrEqual(rows()[0].querySelector('.statement-cells')!.getBoundingClientRect().left);

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

	it('tints the grip of a row under the pointer, as a button', async () => {
		await renderList();

		const grip = rows()[0].querySelector<HTMLElement>('.row-grip')!;

		await userEvent.hover(rows()[0]);

		expect(getComputedStyle(grip).backgroundColor).toBe('rgba(0, 0, 0, 0)');

		await userEvent.hover(grip);

		expect(getComputedStyle(grip).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
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

	it('gives the label row the height of every row, its fields reaching down to its line, the label in the title size beside the predicate', async () => {
		await renderList(SAMPLE, [], RESOURCES, 1000, true);

		const row = rows()[0];
		const cells = row.querySelector('.statement-cells')!.getBoundingClientRect();
		const fields = [row.querySelector<HTMLElement>('vscode-textfield')!, row.querySelector<HTMLElement>('.literal-field-box')!];
		const centreOf = (field: HTMLElement): number => {
			const input = (field.shadowRoot?.querySelector('input') ?? field.querySelector('textarea')!).getBoundingClientRect();

			return Math.round(input.top + input.height / 2);
		};

		expect(Math.round(row.getBoundingClientRect().height)).toBe(32);
		expect(fields.map(field => Math.round(field.getBoundingClientRect().bottom))).toEqual([Math.round(cells.bottom), Math.round(cells.bottom)]);
		expect(getComputedStyle(row.querySelector('textarea')!).fontSize).toBe('17px');
		expect(centreOf(fields[1])).toBe(centreOf(fields[0]));
	});

	it('turns Add value under the nested card of a blank node into the input of the next value, which takes the focus', async () => {
		const node = RdfDataFactory.blankNode('b1');
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
		const nodeCardBody = withAnchors({ subject: node, predicates: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });

		await renderList(cardBody, [nodeCardBody]);

		const row = rows()[0];

		await userEvent.click(within(row).getByRole('button', { name: 'Add value' }));

		const adder = row.querySelector<HTMLElement>(':scope > .statement-cells > .statement-values > .statement-value.is-adder')!;

		await expect.poll(() => adder.querySelector('vscode-textfield')!.matches(':focus-within')).toBe(true);
		expect(adder.checkVisibility()).toBe(true);
		expect(within(row).queryByRole('button', { name: 'Add value' })).toBeNull();

		await leaveList();

		expect(within(row).getByRole('button', { name: 'Add value' })).toBeTruthy();
	});

	it('moves the grip, the predicate and the menu of a row that starts with a collapsed box down to the middle of the box', async () => {
		const node = RdfDataFactory.blankNode('b1');
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
		const nodeCardBody = withAnchors({ subject: node, predicates: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });

		await renderList(cardBody, [nodeCardBody]);

		const row = rows()[0];
		const centreOf = (element: Element): number => Math.round(element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2);
		const box = row.querySelector('.resource-card.is-nested')!;
		const centre = centreOf(row.querySelector('.statement-predicate vscode-textfield')!);

		// The box after the space above the row, the space and the line under it, and Add value a row apart.
		// The chevron of the box has as much room above and under it as beside it.
		const chevron = box.querySelector('.nested-card-chevron')!.getBoundingClientRect();
		const bounds = box.getBoundingClientRect();

		expect(Math.round(chevron.top - bounds.top - 1)).toBe(Math.round(chevron.left - bounds.left - 1));
		expect(Math.round(bounds.bottom - 1 - chevron.bottom)).toBe(Math.round(chevron.left - bounds.left - 1));
		expect(Math.round(bounds.height)).toBe(36);
		expect(Math.round(row.getBoundingClientRect().height * 2) / 2).toBe(2.5 + 36 + 2.5 + 1 + 6 + 26);
		expect([centreOf(box), centreOf(row.querySelector('.row-grip')!), centreOf(row.querySelector('.row-menu')!)]).toEqual([centre, centre, centre]);
	});
});

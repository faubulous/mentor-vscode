// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RDF, RDFS } from '@faubulous/mentor-rdf';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceDetail, TermView } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { StatementList } from './statement-list';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));

const NODE = RdfDataFactory.blankNode('b1');

/**
 * The blank node value of the card, which shows the node in a nested card.
 */
const NODE_VIEW: TermView = { term: NODE, editable: true, nested: { term: NODE, propertyCount: 2 } };

/**
 * The card: a label and a comment, the comment holding a blank node.
 */
const DETAIL = withAnchors(createTestResourceDetail([
	createProperty('rdfs:label', [createLiteralView('Tree')]),
	createProperty('rdfs:comment', [createLiteralView('A plant'), NODE_VIEW])
]));

/**
 * The blank node: a label and a comment of its own.
 */
const NODE_DETAIL: ResourceDetail = withAnchors({
	term: NODE,
	properties: [
		createProperty('rdfs:label', [createLiteralView('Leaf')]),
		createProperty('rdfs:comment', [createLiteralView('Green')])
	]
});

/**
 * Render the card, edited, with the details of its blank node at hand.
 * @param nodeDetail The details of the blank node.
 */
function renderCard(nodeDetail: ResourceDetail = NODE_DETAIL) {
	const host = createEditingHostStub();
	const editing = new EditingController(host);
	const dataService = createResourceDataServiceStub([DETAIL, nodeDetail]);
	const onCopyAsTurtle = vi.fn();
	const context: FormEditorContextValue = { readOnly: false, editing, namespaces: NAMESPACES, languageTags: {}, resources: [], onCopyAsTurtle };

	renderWebview(
		<FormEditorContext.Provider value={context}>
			<StatementList detail={DETAIL} stale={false} dataService={dataService} depth={0} visited={[DETAIL.term]} />
		</FormEditorContext.Provider>
	);

	return { host, editing, onCopyAsTurtle };
}

/**
 * Pick an item of the ⋯ menu of the nested card, as the menu reports a pick.
 * @param value The value of the item.
 */
async function pick(value: string): Promise<void> {
	await act(async () => {
		nestedCard().querySelector('vscode-context-menu')!.dispatchEvent(new CustomEvent('vsc-context-menu-select', { detail: { value } }));
	});
}

/**
 * The nested card of the blank node.
 */
function nestedCard(): HTMLElement {
	return document.querySelector<HTMLElement>('.resource-card.is-nested')!;
}

/**
 * The row of a predicate in the nested card of the blank node.
 */
function nestedRowOf(label: string): HTMLElement {
	return nestedCard().querySelector<HTMLElement>(`.statement-line[aria-label="${label}"]`)!;
}

/**
 * The row of a predicate of the card itself.
 */
function cardRowOf(label: string): HTMLElement {
	return Array.from(document.querySelectorAll<HTMLElement>(`.statement-line[aria-label="${label}"]`)).find(row => !nestedCard().contains(row))!;
}

/**
 * Type into a field, as the user does.
 */
function type(field: HTMLElement, text: string): void {
	(field as HTMLInputElement).value = text;
	fireEvent.input(field);
}

/**
 * Move the focus out of a field to nowhere, as tabbing away from the card does.
 */
async function leave(field: HTMLElement): Promise<void> {
	await act(async () => {
		fireEvent.focusOut(field, { relatedTarget: null });
	});
}

describe('StatementList, with a blank node', () => {
	it('edits the rows of the blank node, writing them with the node as the subject', async () => {
		const { host } = renderCard();
		const field = within(nestedRowOf('rdfs:label')).getByLabelText('Value 1');

		type(field, 'Twig');
		await leave(field);

		expect(host.submitted.map(record => record.operations)).toEqual([[{
			op: 'setValues',
			subject: NODE,
			predicate: RDFS.label,
			values: [{ kind: 'term', term: RdfDataFactory.literal('Twig') }]
		}]]);
	});

	it('leaves the row holding the nested card alone for Escape and Enter pressed in the card', async () => {
		const { host } = renderCard();
		const outer = within(cardRowOf('rdfs:comment')).getAllByLabelText('Value 1').find(field => !nestedCard().contains(field))!;
		const inner = within(nestedRowOf('rdfs:comment')).getByLabelText('Value 1');

		type(outer, 'A tree');
		fireEvent.keyDown(inner, { key: 'Escape' });
		fireEvent.keyDown(inner, { key: 'Enter' });

		expect((outer as HTMLInputElement).value).toBe('A tree');
		expect(host.submitted).toEqual([]);
	});

	it('removes a property of the blank node with the button of its row, which the card itself has not', async () => {
		const { host } = renderCard();

		expect(within(cardRowOf('rdfs:label')).queryByRole('button', { name: 'Remove rdfs:label' })).toBeNull();

		await act(async () => {
			fireEvent.click(within(nestedRowOf('rdfs:label')).getByRole('button', { name: 'Remove rdfs:label' }));
		});

		expect(host.submitted.map(record => record.operations)).toEqual([[{ op: 'setValues', subject: NODE, predicate: RDFS.label, values: [] }]]);
	});

	it('opens a row for a new property of the blank node with Add property, and closes it when it is left empty', async () => {
		renderCard();

		expect(within(nestedCard()).queryByRole('group', { name: 'New statement' })).toBeNull();

		await userEvent.click(within(nestedCard()).getByRole('button', { name: 'Add property' }));

		const row = within(nestedCard()).getByRole('group', { name: 'New statement' });

		await leave(within(row).getByLabelText('Predicate'));

		expect(within(nestedCard()).queryByRole('group', { name: 'New statement' })).toBeNull();
		expect(screen.getAllByRole('group', { name: 'New statement' })).toHaveLength(1);
	});

	it('writes a new property of the blank node typed into the row Add property opened', async () => {
		const { host } = renderCard();

		await userEvent.click(within(nestedCard()).getByRole('button', { name: 'Add property' }));

		const row = within(nestedCard()).getByRole('group', { name: 'New statement' });

		type(within(row).getByLabelText('Predicate'), 'rdfs:seeAlso');
		fireEvent.focusOut(within(row).getByLabelText('Predicate'), { relatedTarget: within(row).getByLabelText('New value') });
		type(within(row).getByLabelText('New value'), 'ex:Leaf');
		await leave(within(row).getByLabelText('New value'));

		expect(host.submitted.map(record => record.operations)).toEqual([[{
			op: 'setValues',
			subject: NODE,
			predicate: RDFS.seeAlso,
			values: [{ kind: 'term', term: RdfDataFactory.namedNode(`${TEST_NAMESPACES.ex}Leaf`) }]
		}]]);
	});

	it('leads the nested card with its type, after a chevron that collapses the card to the type and names the other properties', async () => {
		const typed: ResourceDetail = withAnchors({ term: NODE, properties: [...NODE_DETAIL.properties, createProperty('rdf:type', [createIriView('owl:Restriction', 'Restriction')])] });

		renderCard(typed);

		const header = within(nestedCard()).getByRole('group', { name: 'Type' });

		expect(nestedCard().querySelector('.statement-line')).toBe(header);
		expect(header.querySelector('.statement-predicate')?.textContent).toBe('type');
		expect(within(header).getByText('Restriction')).toBeTruthy();

		await userEvent.click(within(header).getByRole('button', { name: 'Collapse' }));

		expect(within(nestedCard()).queryByRole('group', { name: 'rdfs:label' })).toBeNull();
		expect(within(nestedCard()).queryByRole('button', { name: 'Add property' })).toBeNull();
		expect(header.querySelector('.nested-card-summary')?.textContent).toBe('rdfs:label, rdfs:comment');

		await userEvent.click(within(header).getByRole('button', { name: 'Expand' }));

		expect(within(nestedCard()).getByRole('group', { name: 'rdfs:label' })).toBeTruthy();
	});

	it('asks to choose the type of an untyped node, and writes the type typed into it', async () => {
		const { host } = renderCard();
		const header = within(nestedCard()).getByRole('group', { name: 'Type' });
		const input = within(header).getByLabelText('New value');

		expect(input.getAttribute('placeholder')).toBe('Choose type');

		type(input, 'ex:Leaf');
		await leave(input);

		expect(host.submitted.map(record => record.operations)).toEqual([[{
			op: 'setValues',
			subject: NODE,
			predicate: RDF.type,
			values: [{ kind: 'term', term: RdfDataFactory.namedNode(`${TEST_NAMESPACES.ex}Leaf`) }]
		}]]);
	});

	it('duplicates the blank node from the ⋯ menu of its card, writing a copy after it at once', async () => {
		const { host } = renderCard();

		expect(within(nestedCard()).getByRole('button', { name: 'More actions' })).toBeTruthy();

		await pick('duplicate');

		expect(host.submitted.map(record => record.operations)).toEqual([[{
			op: 'setValues',
			subject: TEST_SUBJECT,
			predicate: RDFS.comment,
			values: [{ kind: 'existing', anchor: 120 }, { kind: 'existing', anchor: 130 }, { kind: 'copy', anchor: 130 }]
		}]]);
	});

	it('removes the blank node from the ⋯ menu of its card, writing the row at once', async () => {
		const { host } = renderCard();

		await pick('remove');

		expect(host.submitted.map(record => record.operations)).toEqual([[{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.comment, values: [{ kind: 'existing', anchor: 120 }] }]]);
	});

	it('copies the blank node as Turtle from the ⋯ menu of its card, by where it is written', async () => {
		const { onCopyAsTurtle } = renderCard();

		await pick('copy');

		expect(onCopyAsTurtle).toHaveBeenCalledWith(130, 1);
	});

	it('opens the ⋯ menu on a right-click on the card, but leaves a right-click in a text field to the browser', () => {
		renderCard();

		const menu = nestedCard().querySelector('vscode-context-menu') as HTMLElement & { show?: boolean };

		fireEvent.contextMenu(within(nestedRowOf('rdfs:label')).getByLabelText('Value 1'));

		expect(menu.show).not.toBe(true);

		fireEvent.contextMenu(nestedRowOf('rdfs:label'));

		expect(menu.show).toBe(true);
	});
});

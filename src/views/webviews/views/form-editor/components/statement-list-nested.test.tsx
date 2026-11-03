// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RDFS } from '@faubulous/mentor-rdf';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { TEST_NAMESPACES, createLiteralView, createProperty, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceDetail, TermView } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { StatementList } from './statement-list';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));

const NODE = RdfDataFactory.blankNode('b1');

/**
 * The blank node value of the card, which shows the node in a box.
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
 */
function renderCard() {
	const host = createEditingHostStub();
	const editing = new EditingController(host);
	const dataService = createResourceDataServiceStub([DETAIL, NODE_DETAIL]);
	const context: FormEditorContextValue = { readOnly: false, editing, namespaces: NAMESPACES, languageTags: {}, resources: [] };

	renderWebview(
		<FormEditorContext.Provider value={context}>
			<StatementList detail={DETAIL} stale={false} dataService={dataService} depth={0} visited={[DETAIL.term]} />
		</FormEditorContext.Provider>
	);

	return { host, editing };
}

/**
 * The box of the blank node.
 */
function box(): HTMLElement {
	return document.querySelector<HTMLElement>('.resource-card.is-nested')!;
}

/**
 * The row of a predicate in the box of the blank node.
 */
function nestedRowOf(label: string): HTMLElement {
	return box().querySelector<HTMLElement>(`.statement-line[aria-label="${label}"]`)!;
}

/**
 * The row of a predicate of the card itself.
 */
function cardRowOf(label: string): HTMLElement {
	return Array.from(document.querySelectorAll<HTMLElement>(`.statement-line[aria-label="${label}"]`)).find(row => !box().contains(row))!;
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

	it('leaves the row holding the box alone for Escape and Enter pressed in the box', async () => {
		const { host } = renderCard();
		const outer = within(cardRowOf('rdfs:comment')).getAllByLabelText('Value 1').find(field => !box().contains(field))!;
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

		expect(within(box()).queryByRole('group', { name: 'New statement' })).toBeNull();

		await userEvent.click(within(box()).getByRole('button', { name: 'Add property' }));

		const row = within(box()).getByRole('group', { name: 'New statement' });

		await leave(within(row).getByLabelText('Predicate'));

		expect(within(box()).queryByRole('group', { name: 'New statement' })).toBeNull();
		expect(screen.getAllByRole('group', { name: 'New statement' })).toHaveLength(1);
	});

	it('writes a new property of the blank node typed into the row Add property opened', async () => {
		const { host } = renderCard();

		await userEvent.click(within(box()).getByRole('button', { name: 'Add property' }));

		const row = within(box()).getByRole('group', { name: 'New statement' });

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
});

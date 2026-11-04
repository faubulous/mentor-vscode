// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RDF, RDFS } from '@faubulous/mentor-rdf';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
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
const NODE_VIEW: TermView = { term: NODE, editable: true, nested: { term: NODE, propertyCount: 1 } };

/**
 * The card: a resource it sees also, anchored at 110, and a comment that is a blank node only.
 */
const DETAIL = withAnchors(createTestResourceDetail([
	createProperty('rdfs:seeAlso', [createIriView('ex:Plant', 'Plant')]),
	createProperty('rdfs:comment', [NODE_VIEW])
]));

/**
 * The blank node.
 */
const NODE_DETAIL: ResourceDetail = withAnchors({ term: NODE, properties: [createProperty('rdfs:label', [createLiteralView('Leaf')])] });

/**
 * Render the card, edited.
 */
function renderCard() {
	const host = createEditingHostStub();
	const editing = new EditingController(host);
	const context: FormEditorContextValue = { readOnly: false, editing, namespaces: NAMESPACES, languageTags: {}, resources: [] };

	renderWebview(
		<FormEditorContext.Provider value={context}>
			<StatementList detail={DETAIL} stale={false} dataService={createResourceDataServiceStub([DETAIL, NODE_DETAIL])} depth={0} visited={[DETAIL.term]} />
		</FormEditorContext.Provider>
	);

	return { host };
}

/**
 * The row of a predicate of the card itself.
 */
function rowOf(label: string): HTMLElement {
	return Array.from(document.querySelectorAll<HTMLElement>(`.statement-line[aria-label="${label}"]`)).find(row => row.closest('.resource-card.is-nested') === null)!;
}

/**
 * The input of a new value of a row of the card itself.
 */
function newValueInputOf(row: HTMLElement): HTMLElement | undefined {
	return Array.from(row.querySelectorAll<HTMLElement>('[aria-label="New value"]')).find(input => input.closest('.resource-card.is-nested') === null);
}

/**
 * Start a new blank node in a row, as typing `[` into its empty input of a new value does.
 * @returns The nested card of the new node.
 */
function startNode(row: HTMLElement): HTMLElement {
	fireEvent.keyDown(newValueInputOf(row)!, { key: '[' });

	return within(row).getByRole('group', { name: 'New blank node' });
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

describe('StatementList, with new blank nodes', () => {
	it('starts a new blank node with [, asks for its type, and writes it with the type when the row is left', async () => {
		const { host } = renderCard();
		const row = rowOf('rdfs:seeAlso');
		const card = startNode(row);
		const input = within(card).getByLabelText('New value');

		expect(input.getAttribute('placeholder')).toBe('Choose type');

		type(input, 'ex:Leaf');
		fireEvent.keyDown(input, { key: 'Enter' });
		await leave(input);

		expect(host.submitted.map(record => record.operations)).toEqual([[{
			op: 'setValues',
			subject: TEST_SUBJECT,
			predicate: RDFS.seeAlso,
			values: [
				{ kind: 'existing', anchor: 110 },
				{ kind: 'node', statements: [{ predicate: RDF.type, values: [{ kind: 'term', term: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Leaf`) }] }] }
			]
		}]]);
	});

	it('drops a new blank node without a type when the row is left, and on Escape, writing nothing', async () => {
		const { host } = renderCard();
		const row = rowOf('rdfs:seeAlso');

		await leave(within(startNode(row)).getByLabelText('New value'));

		expect(within(row).queryByRole('group', { name: 'New blank node' })).toBeNull();

		fireEvent.keyDown(within(startNode(row)).getByLabelText('New value'), { key: 'Escape' });

		expect(within(row).queryByRole('group', { name: 'New blank node' })).toBeNull();
		expect(host.submitted).toEqual([]);
	});

	it('offers Add value under a row of blank nodes only, which brings back the input of a new value', async () => {
		renderCard();
		const row = rowOf('rdfs:comment');

		expect(newValueInputOf(row)).toBeUndefined();

		await userEvent.click(within(row).getByRole('button', { name: 'Add value' }));

		expect(newValueInputOf(row)).toBeDefined();
		expect(within(row).queryByRole('button', { name: 'Add value' })).toBeNull();
	});
});

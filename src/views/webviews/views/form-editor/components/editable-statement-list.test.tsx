// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, within } from '@testing-library/react';
import { RDFS, XSD } from '@faubulous/mentor-rdf';
import { createEditingControllerStub, EditingControllerStub } from '@src/utilities/mocks/editing-controller-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createSampleResourceDetail, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { ResourceDetail } from '../form-editor-model';
import { CellKey } from '../state/cell-key';
import { EditingState } from '../state/editing-state';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { StatementList } from './statement-list';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri, usageCount: 1 }));

/**
 * The detail the tests edit: a type, a label and a subclass statement, each value anchored.
 */
const SAMPLE = withAnchors(createSampleResourceDetail());

/**
 * Render the statements of a detail with a recording controller.
 */
function renderList(detail: ResourceDetail = SAMPLE, editing: EditingControllerStub = createEditingControllerStub()) {
	const dataService = createResourceDataServiceStub([detail]);
	const ui = (current: ResourceDetail, stale = false) => (
		<FormEditorContext.Provider value={{ readOnly: false, editing, namespaces: NAMESPACES, resources: [] } satisfies FormEditorContextValue}>
			<StatementList detail={current} stale={stale} dataService={dataService} depth={0} visited={[current.id]} />
		</FormEditorContext.Provider>
	);
	const result = renderWebview(ui(detail));

	return { ...result, editing, rerenderWith: (next: ResourceDetail, stale = false) => result.rerender(ui(next, stale)) };
}

/**
 * The rows of the list, in order.
 */
function rows(): HTMLElement[] {
	return Array.from(document.querySelectorAll<HTMLElement>('.statement-line'));
}

/**
 * Type into a field, as the user does.
 */
function type(field: HTMLElement, text: string): void {
	(field as HTMLInputElement).value = text;
	fireEvent.input(field);
}

/**
 * Move the focus out of a row, as tabbing away from it does.
 */
async function leave(row: HTMLElement): Promise<void> {
	await act(async () => {
		fireEvent.focusOut(row.querySelector('vscode-textfield')!, { relatedTarget: null });
	});
}

describe('StatementList, edited', () => {
	it('shows each statement as fields and a row for a new statement after them', () => {
		renderList();

		expect(rows().map(row => row.getAttribute('aria-label'))).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'New statement']);
		expect((within(rows()[1]).getByLabelText('Value 1') as HTMLInputElement).value).toBe('Tree');
		expect(within(rows()[1]).getByText('en').classList.contains('literal-field-tag')).toBe(true);
		expect(within(rows()[0]).getByText('Class').closest('.value-pill')).not.toBeNull();
	});

	it('writes an edited literal as a new term among the written values, from the version of the data', async () => {
		const { editing } = renderList();

		type(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);

		expect(editing.submitted).toEqual([{
			operations: [{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: { kind: 'literal', value: 'Oak', language: 'en' } }] }],
			cellKey: new CellKey({ resourceId: SAMPLE.id, column: 'statement', propertyIndex: 1 }),
			baseVersion: 1
		}]);
	});

	it('writes nothing when a row is left as it was', async () => {
		const { editing } = renderList();

		type(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		type(within(rows()[1]).getByLabelText('Value 1'), 'Tree');
		await leave(rows()[1]);

		expect(editing.submitted).toEqual([]);
	});

	it('adds a typed resource and removes a pill', async () => {
		const { editing } = renderList();
		const row = rows()[2];
		const field = within(row).getByLabelText('New value');

		type(field, 'ex:Plant');
		fireEvent.keyDown(field, { key: 'Enter' });
		fireEvent.click(within(row).getByLabelText('Remove Thing'));
		await leave(row);

		expect(editing.submitted[0].operations).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, values: [{ kind: 'term', term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Plant` } }] }]);
	});

	it('shows why a typed value is no term and keeps it', async () => {
		const { editing } = renderList();
		const row = rows()[2];
		const field = within(row).getByLabelText('New value') as HTMLInputElement;

		type(field, 'foo:Plant');
		fireEvent.keyDown(field, { key: 'Enter' });

		expect(within(row).getByRole('alert').textContent).toMatch(/'foo' is not declared/);

		await leave(row);

		expect(field.value).toBe('foo:Plant');
		expect(editing.submitted).toEqual([]);
	});

	it('shows why a number does not fit its datatype, and puts the stored value back when the row is left', async () => {
		const detail = withAnchors(createTestResourceDetail([createProperty('ex:count', [{ term: { kind: 'literal', value: '42', datatype: XSD.integer }, editable: true }])]));
		const { editing } = renderList(detail);
		const field = within(rows()[0]).getByLabelText('Value 1') as HTMLInputElement;

		type(field, '4.5');

		expect(within(rows()[0]).getByText(/Whole numbers/).classList.contains('is-problem')).toBe(true);

		fireEvent.keyDown(field, { key: 'Enter' });
		await leave(rows()[0]);

		expect(editing.submitted).toEqual([]);
		expect(field.value).toBe('42');
	});

	it('writes a new predicate as soon as its field is left', () => {
		const { editing } = renderList();
		const row = rows()[1];
		const predicate = within(row).getByLabelText('Predicate');

		fireEvent.focus(predicate);
		type(predicate, 'rdfs:comment');
		fireEvent.focusOut(predicate, { relatedTarget: within(row).getByLabelText('New value') });

		expect(editing.submitted.map(edit => edit.operations[0])).toEqual([{ op: 'setPredicate', subject: TEST_SUBJECT, predicate: RDFS.label, newPredicate: RDFS.comment }]);
	});

	it('gives up what was typed with Escape', async () => {
		const { editing } = renderList();
		const field = within(rows()[1]).getByLabelText('Value 1') as HTMLInputElement;

		type(field, 'Oak');
		fireEvent.keyDown(field, { key: 'Escape' });
		await leave(rows()[1]);

		expect(field.value).toBe('Tree');
		expect(editing.submitted).toEqual([]);
	});

	it('writes a new statement typed into its row, shows it as read until the host does, and opens another row', async () => {
		const { editing } = renderList();
		const row = rows()[3];

		type(within(row).getByLabelText('Predicate'), 'rdfs:comment');
		fireEvent.focusOut(within(row).getByLabelText('Predicate'), { relatedTarget: within(row).getByLabelText('New value') });
		type(within(row).getByLabelText('New value'), 'A tree');
		await leave(row);

		expect(editing.submitted[0].operations).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.comment, values: [{ kind: 'term', term: { kind: 'literal', value: 'A tree' } }] }]);
		expect(rows().map(current => current.getAttribute('aria-label'))).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'rdfs:comment', 'New statement']);
		expect(rows()[3].classList.contains('is-editable')).toBe(false);
	});

	it('holds a second change back until the first one arrives, then writes it against the new anchors', async () => {
		const { editing, rerenderWith } = renderList();

		type(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);
		type(within(rows()[1]).getByLabelText('Value 1'), 'Elm');
		await leave(rows()[1]);

		expect(editing.submitted).toHaveLength(1);

		await editing.settle();

		const delivered: ResourceDetail = { ...SAMPLE, properties: SAMPLE.properties.map((property, index) => index === 1 ? { ...property, values: [{ ...createLiteralView('Oak', 'en'), anchor: 500 }] } : property) };

		await act(async () => rerenderWith(delivered));

		expect(editing.submitted).toHaveLength(2);
		expect(editing.submitted[1].operations[0]).toEqual({ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: { kind: 'literal', value: 'Elm', language: 'en' } }] });
	});

	it('writes nothing while the data is stale, and writes once it is current', async () => {
		const { editing, rerenderWith } = renderList();

		await act(async () => rerenderWith(SAMPLE, true));
		type(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);

		expect(editing.submitted).toHaveLength(0);

		await act(async () => rerenderWith({ ...SAMPLE }, false));

		expect(editing.submitted).toHaveLength(1);
	});

	it('shows why the host did not apply an edit and lets it be dismissed', () => {
		const key = new CellKey({ resourceId: SAMPLE.id, column: 'statement', propertyIndex: 1 });
		const { editing } = renderList(SAMPLE, createEditingControllerStub(EditingState.INITIAL.withError(key, 'Nope', 'notFound')));

		expect(within(rows()[1]).getByRole('alert').textContent).toContain('Nope');

		fireEvent.click(within(rows()[1]).getByLabelText('Dismiss'));

		expect(editing.dismissed).toEqual([key]);
	});

	it('reads the rows whose values cannot all be kept by their place', () => {
		const detail = createTestResourceDetail([createProperty('ex:p', [createIriView('ex:A', 'A')])]);

		renderList(detail);

		expect(rows()[0].classList.contains('is-editable')).toBe(false);
		expect(rows()[1].getAttribute('aria-label')).toBe('New statement');
	});
});

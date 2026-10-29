// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { RDF, RDFS, XSD } from '@faubulous/mentor-rdf';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createEditingControllerStub } from '@src/utilities/mocks/editing-controller-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createIriView, createProperty, createSampleResourceDetail, createTestResourceDetail, TEST_SUBJECT, TEST_SUBJECT_ID } from '@src/utilities/mocks/statement-fixtures';
import { LINE_TEST_NAMESPACES } from '@src/utilities/mocks/line-fixtures';
import { ResourceDetail, TermView } from '../form-editor-model';
import { CellKey } from '../state/cell-key';
import { EditingState } from '../state/editing-state';
import { FormEditorContext } from '../state/form-editor-context';
import { EditableStatementList } from './editable-statement-list';

const NAMESPACES = Object.entries(LINE_TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri, usageCount: 1 }));

/**
 * The key of a property row of the test subject.
 */
function rowKey(propertyIndex: number): CellKey {
	return new CellKey({ resourceId: TEST_SUBJECT_ID, column: 'line', propertyIndex });
}

/**
 * Render the editable rows of a detail with a recording controller.
 */
function renderList(detail: ResourceDetail = createSampleResourceDetail(), state = EditingState.INITIAL) {
	const editing = createEditingControllerStub(state);
	const result = renderWebview(
		<FormEditorContext.Provider value={{ readOnly: false, editing, namespaces: NAMESPACES, resources: [] }}>
			<EditableStatementList detail={detail} dataService={createResourceDataServiceStub([detail])} editing={editing} />
		</FormEditorContext.Provider>
	);

	return { ...result, editing };
}

/**
 * Let the focus settle and the row commit, as the row waits a tick after the focus left it.
 */
async function settle(): Promise<void> {
	await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

/**
 * The rows of the list, in order.
 */
function rows(): HTMLElement[] {
	return screen.getAllByRole('group').filter(element => element.classList.contains('statement-line'));
}

/**
 * Type a text into a field, as the user does.
 */
function type(field: HTMLElement, text: string): void {
	(field as HTMLInputElement).value = text;
	fireEvent.input(field);
}

describe('EditableStatementList', () => {
	it('shows each statement as fields, with a row for a new statement after them', () => {
		renderList();

		expect(rows().map(row => row.getAttribute('aria-label'))).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'New statement']);
		expect((screen.getByLabelText('Value 1') as HTMLInputElement).value).toBe('Tree');
		expect(screen.getByText('en').classList.contains('literal-tag-button')).toBe(true);
		expect(screen.getByLabelText('Class').classList.contains('value-pill')).toBe(true);
	});

	it('writes an edited literal once the row is left', async () => {
		const { editing } = renderList();
		const textarea = screen.getByLabelText('Value 1');

		fireEvent.focusIn(textarea);
		type(textarea, 'Oak');
		fireEvent.focusOut(textarea);
		await settle();

		expect(editing.submitted).toMatchObject([{ operations: [{ op: 'replaceStatement', subject: TEST_SUBJECT, predicate: RDFS.label, text: 'rdfs:label "Oak"@en' }], cellKey: rowKey(1) }]);
	});

	it('adds a statement typed into the draft row and opens another one', async () => {
		const { editing } = renderList();
		const draft = screen.getByRole('group', { name: 'New statement' });
		const newValue = within(draft).getByLabelText('New value');

		fireEvent.focusIn(draft);
		type(within(draft).getByLabelText('Predicate'), 'rdfs:comment');
		type(newValue, 'A tree');
		fireEvent.keyDown(newValue, { key: 'Enter' });
		// The typed text became a literal field; Enter in it writes the row.
		fireEvent.keyDown(within(draft).getByLabelText('Value 1'), { key: 'Enter' });
		await settle();

		expect(editing.submitted).toMatchObject([{ operations: [{ op: 'replaceStatement', subject: TEST_SUBJECT, text: 'rdfs:comment "A tree"' }] }]);
		expect(editing.submitted[0].operations[0]).not.toHaveProperty('predicate');
		expect(screen.getAllByRole('group', { name: 'New statement' })).toHaveLength(2);
	});

	it('removes the statement when its last value goes', async () => {
		const { editing } = renderList();
		const pill = screen.getByLabelText('Class');
		const row = screen.getByRole('group', { name: 'rdf:type' });

		fireEvent.focusIn(pill);
		fireEvent.keyDown(pill, { key: 'Backspace' });
		// The caret moved on to the field for a new value; the user leaves the row from there.
		await act(async () => undefined);
		act(() => (document.activeElement as HTMLElement | null)?.blur());
		fireEvent.focusOut(row);
		await settle();

		expect(editing.submitted).toMatchObject([{ operations: [{ op: 'deleteProperty', subject: TEST_SUBJECT, predicate: RDF.type }], cellKey: rowKey(0), predictedFocus: rowKey(0) }]);
	});

	it('gives up what was typed with Escape and writes nothing', async () => {
		const { editing } = renderList();
		const textarea = screen.getByLabelText('Value 1') as HTMLInputElement;

		fireEvent.focusIn(textarea);
		type(textarea, 'Oak');
		fireEvent.keyDown(textarea, { key: 'Escape' });

		expect(textarea.value).toBe('Tree');

		fireEvent.focusOut(textarea);
		await settle();

		expect(editing.submitted).toEqual([]);
	});

	it('shows why the host did not apply an edit and lets it be dismissed', () => {
		const { editing } = renderList(createSampleResourceDetail(), EditingState.INITIAL.withError(rowKey(1), 'Nope', 'notFound'));

		expect(screen.getByRole('alert').textContent).toContain('Nope');

		fireEvent.click(screen.getByLabelText('Dismiss'));

		expect(editing.dismissed).toEqual([rowKey(1)]);
	});

	it('keeps a row with a blank node among the items of a list read-only', () => {
		const nested: TermView = { term: { kind: 'bnode', id: 'n1' }, editable: true, nested: { id: 'b:n1', propertyCount: 1, iconName: 'mentor-rdf-individual' } };
		const list: TermView = { term: { kind: 'bnode', id: 'l' }, editable: true, collection: { items: [createIriView('ex:A', 'A'), nested] } };

		renderList(createTestResourceDetail([createProperty('ex:p', [list]), createProperty('ex:q', [createIriView('ex:B', 'B')])]));

		const [first, second] = rows();

		expect(within(first).queryByLabelText('Predicate')).toBeNull();
		expect(within(second).getByLabelText('Predicate')).toBeTruthy();
	});

	it('continues in the input of the row with a character typed on a pill', async () => {
		renderList();

		const pill = screen.getByLabelText('Class');

		fireEvent.focusIn(pill);
		fireEvent.keyDown(pill, { key: 'x' });
		await act(async () => undefined);

		const input = within(rows()[0]).getByLabelText('New value') as HTMLInputElement;

		expect(input.value).toBe('x');
		expect(document.activeElement).toBe(input);
	});

	it('shows why a number does not fit its datatype and puts the stored value back when the row is left', async () => {
		const { editing } = renderList(createTestResourceDetail([createProperty('ex:count', [{ term: { kind: 'literal', value: '42', datatype: XSD.integer }, editable: true }])]));
		const field = screen.getByLabelText('Value 1') as HTMLInputElement;

		fireEvent.focusIn(field);
		type(field, '4.5');

		expect(screen.getByText(/Whole numbers/).classList.contains('is-problem')).toBe(true);

		fireEvent.keyDown(field, { key: 'Enter' });
		expect(editing.submitted).toEqual([]);

		fireEvent.focusOut(field);
		await settle();

		expect(editing.submitted).toEqual([]);
		expect(field.value).toBe('42');
	});

	it('opens the tag picker from the button of the tag', () => {
		renderList();

		fireEvent.click(screen.getByText('en'));

		expect(document.querySelector('.tag-picker')).not.toBeNull();
	});

	it('moves to the predicate of the row below with the arrow', async () => {
		renderList();

		const [first, second] = rows();
		const predicate = within(first).getByLabelText('Predicate');

		act(() => predicate.focus());
		fireEvent.keyDown(predicate, { key: 'ArrowDown' });
		await act(async () => undefined);

		expect(document.activeElement).toBe(within(second).getByLabelText('Predicate'));
	});
});

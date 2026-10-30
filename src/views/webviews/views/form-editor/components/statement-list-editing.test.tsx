// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, within } from '@testing-library/react';
import { RDFS, XSD } from '@faubulous/mentor-rdf';
import { createEditingHostStub, EditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createSampleResourceDetail, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { PropertyView, ResourceDetail } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { StatementList } from './statement-list';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));

/**
 * The detail the tests edit: a type, a label and a subclass statement, each value anchored.
 */
const SAMPLE = withAnchors(createSampleResourceDetail());

/**
 * Render the statements of a detail, written through a controller over a recording host.
 */
function renderList(detail: ResourceDetail = SAMPLE) {
	const host = createEditingHostStub();
	const editing = new EditingController(host);
	const dataService = createResourceDataServiceStub([detail]);
	const ui = (current: ResourceDetail, stale = false) => (
		<FormEditorContext.Provider value={{ readOnly: false, editing, namespaces: NAMESPACES, resources: [] } satisfies FormEditorContextValue}>
			<StatementList detail={current} stale={stale} dataService={dataService} depth={0} visited={[current.id]} />
		</FormEditorContext.Provider>
	);
	const result = renderWebview(ui(detail));

	/**
	 * Deliver the detail as the host does after an edit: for the next version, or stale.
	 */
	const deliver = async (next: ResourceDetail, options: { stale?: boolean; version?: number } = {}) => {
		dataService.version = options.version ?? dataService.version;
		await act(async () => result.rerender(ui(next, options.stale ?? false)));
	};

	return { ...result, host, deliver };
}

/**
 * The rows of the list, in order.
 */
function rows(): HTMLElement[] {
	return Array.from(document.querySelectorAll<HTMLElement>('.statement-line'));
}

/**
 * The labels of the rows, in order.
 */
function rowLabels(): (string | null)[] {
	return rows().map(row => row.getAttribute('aria-label'));
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

/**
 * Settle the oldest edit with the host, as applied unless told otherwise.
 */
async function settle(host: EditingHostStub, outcome?: Parameters<EditingHostStub['settle']>[0]): Promise<void> {
	await act(async () => host.settle(outcome));
}

/**
 * The sample with the values of one of its properties replaced, as the host delivers it after an
 * edit of that property.
 */
function withValues(index: number, values: PropertyView['values']): ResourceDetail {
	return { ...SAMPLE, properties: SAMPLE.properties.map((property, position) => position === index ? { ...property, values } : property) };
}

/**
 * Type a new statement into the row for new statements and leave it.
 */
async function typeNewStatement(predicate: string, value: string): Promise<void> {
	const row = rows()[rows().length - 1];

	type(within(row).getByLabelText('Predicate'), predicate);
	fireEvent.focusOut(within(row).getByLabelText('Predicate'), { relatedTarget: within(row).getByLabelText('New value') });
	type(within(row).getByLabelText('New value'), value);
	await leave(row);
}

describe('StatementList, edited', () => {
	it('shows each statement as fields and a row for a new statement after them', () => {
		renderList();

		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'New statement']);
		expect((within(rows()[1]).getByLabelText('Value 1') as HTMLInputElement).value).toBe('Tree');
		expect(within(rows()[1]).getByText('en').classList.contains('literal-field-tag')).toBe(true);
		expect(within(rows()[0]).getByText('Class').closest('.value-pill')).not.toBeNull();
	});

	it('writes an edited literal as a new term among the written values, from the version of the data', async () => {
		const { host } = renderList();

		type(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);

		expect(host.submitted).toEqual([{
			operations: [{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: { kind: 'literal', value: 'Oak', language: 'en' } }] }],
			baseVersion: 1
		}]);
	});

	it('writes nothing when a row is left as it was', async () => {
		const { host } = renderList();

		type(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		type(within(rows()[1]).getByLabelText('Value 1'), 'Tree');
		await leave(rows()[1]);

		expect(host.submitted).toEqual([]);
	});

	it('adds a typed resource and removes a pill', async () => {
		const { host } = renderList();
		const row = rows()[2];
		const field = within(row).getByLabelText('New value');

		type(field, 'ex:Plant');
		fireEvent.keyDown(field, { key: 'Enter' });
		fireEvent.click(within(row).getByLabelText('Remove Thing'));
		await leave(row);

		expect(host.submitted[0].operations).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, values: [{ kind: 'term', term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Plant` } }] }]);
	});

	it('shows why a typed value is no term and keeps it', async () => {
		const { host } = renderList();
		const row = rows()[2];
		const field = within(row).getByLabelText('New value') as HTMLInputElement;

		type(field, 'foo:Plant');
		fireEvent.keyDown(field, { key: 'Enter' });

		expect(within(row).getByRole('alert').textContent).toMatch(/'foo' is not declared/);

		await leave(row);

		expect(field.value).toBe('foo:Plant');
		expect(host.submitted).toEqual([]);
	});

	it('shows why a number does not fit its datatype, and puts the stored value back when the row is left', async () => {
		const detail = withAnchors(createTestResourceDetail([createProperty('ex:count', [{ term: { kind: 'literal', value: '42', datatype: XSD.integer }, editable: true }])]));
		const { host } = renderList(detail);
		const field = within(rows()[0]).getByLabelText('Value 1') as HTMLInputElement;

		type(field, '4.5');

		expect(within(rows()[0]).getByText(/Whole numbers/).classList.contains('is-problem')).toBe(true);

		fireEvent.keyDown(field, { key: 'Enter' });
		await leave(rows()[0]);

		expect(host.submitted).toEqual([]);
		expect(field.value).toBe('42');
	});

	it('writes a new predicate as soon as its field is left', () => {
		const { host } = renderList();
		const row = rows()[1];
		const predicate = within(row).getByLabelText('Predicate');

		fireEvent.focus(predicate);
		type(predicate, 'rdfs:comment');
		fireEvent.focusOut(predicate, { relatedTarget: within(row).getByLabelText('New value') });

		expect(host.submitted.map(edit => edit.operations[0])).toEqual([{ op: 'setPredicate', subject: TEST_SUBJECT, predicate: RDFS.label, newPredicate: RDFS.comment }]);
	});

	it('keeps the row of a renamed predicate, and its element, when the property arrives under the new name', async () => {
		const { host, deliver } = renderList();
		const row = rows()[1];
		const predicate = within(row).getByLabelText('Predicate');

		fireEvent.focus(predicate);
		type(predicate, 'rdfs:comment');
		fireEvent.focusOut(predicate, { relatedTarget: within(row).getByLabelText('New value') });
		await settle(host);

		const renamed: PropertyView = { ...SAMPLE.properties[1], predicate: { term: { kind: 'iri', iri: RDFS.comment }, prefixedName: 'rdfs:comment', editable: true } };

		await deliver({ ...SAMPLE, properties: [SAMPLE.properties[0], renamed, SAMPLE.properties[2]] }, { version: 2 });

		expect(rows()[1]).toBe(row);
		expect(row.getAttribute('aria-label')).toBe('rdfs:comment');
	});

	it('gives up what was typed with Escape', async () => {
		const { host } = renderList();
		const field = within(rows()[1]).getByLabelText('Value 1') as HTMLInputElement;

		type(field, 'Oak');
		fireEvent.keyDown(field, { key: 'Escape' });
		await leave(rows()[1]);

		expect(field.value).toBe('Tree');
		expect(host.submitted).toEqual([]);
	});

	it('writes a new statement typed into its row, keeps the row editable until the host shows it, and opens another row', async () => {
		const { host, deliver } = renderList();

		await typeNewStatement('rdfs:comment', 'A tree');

		expect(host.submitted[0].operations).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.comment, values: [{ kind: 'term', term: { kind: 'literal', value: 'A tree' } }] }]);
		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'New statement', 'New statement']);

		const submitted = rows()[3];

		expect(submitted.classList.contains('is-editable')).toBe(true);

		await settle(host);
		await deliver({ ...SAMPLE, properties: [...SAMPLE.properties, { predicate: { term: { kind: 'iri', iri: RDFS.comment }, prefixedName: 'rdfs:comment', editable: true }, values: [{ ...createLiteralView('A tree'), anchor: 900 }] }] }, { version: 2 });

		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'rdfs:comment', 'New statement']);
		expect(rows()[3]).toBe(submitted);
	});

	it('adds a new statement of a predicate the card shows to the values of that predicate', async () => {
		const { host } = renderList();

		await typeNewStatement('rdfs:label', 'Baum');

		expect(host.submitted[0].operations).toEqual([{
			op: 'setValues',
			subject: TEST_SUBJECT,
			predicate: RDFS.label,
			values: [{ kind: 'existing', anchor: SAMPLE.properties[1].values[0].anchor }, { kind: 'term', term: { kind: 'literal', value: 'Baum' } }]
		}]);
		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'New statement']);
	});

	it('keeps a refused new statement editable, with the reason shown under it', async () => {
		const { host } = renderList();

		await typeNewStatement('rdfs:comment', 'A tree');
		await settle(host, { ok: false, reason: 'invalidTerm', message: 'Nope', version: 1 });

		const refused = rows()[3];

		expect(refused.classList.contains('is-editable')).toBe(true);
		expect(within(refused).getByRole('alert').textContent).toContain('Nope');
		expect((within(refused).getByLabelText('Value 1') as HTMLInputElement).value).toBe('A tree');

		fireEvent.click(within(refused).getByLabelText('Dismiss'));

		expect(within(refused).queryByRole('alert')).toBeNull();
	});

	it('holds a second change back until the first one arrives, then writes it against the new anchors', async () => {
		const { host, deliver } = renderList();

		type(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);
		type(within(rows()[1]).getByLabelText('Value 1'), 'Elm');
		await leave(rows()[1]);

		expect(host.submitted).toHaveLength(1);

		await settle(host);

		expect(host.submitted).toHaveLength(1);

		await deliver(withValues(1, [{ ...createLiteralView('Oak', 'en'), anchor: 500 }]), { version: 2 });

		expect(host.submitted).toHaveLength(2);
		expect(host.submitted[1]).toEqual({
			operations: [{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: { kind: 'literal', value: 'Elm', language: 'en' } }] }],
			baseVersion: 2
		});
	});

	it('holds the change of another row back until the first edit arrives, so it is built from the new version', async () => {
		const { host, deliver } = renderList();

		type(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);
		type(within(rows()[2]).getByLabelText('New value'), 'ex:Plant');
		await leave(rows()[2]);

		expect(host.submitted).toHaveLength(1);

		await settle(host);
		await deliver(withValues(1, [{ ...createLiteralView('Oak', 'en'), anchor: 500 }]), { stale: true, version: 2 });

		expect(host.submitted).toHaveLength(1);

		await deliver(withValues(1, [{ ...createLiteralView('Oak', 'en'), anchor: 500 }]), { version: 2 });

		expect(host.submitted[1].baseVersion).toBe(2);
		expect(host.submitted[1].operations[0]).toMatchObject({ op: 'setValues', predicate: RDFS.subClassOf });
	});

	it('keeps what is typed in a row when a property is inserted before it', async () => {
		const { deliver } = renderList();
		const field = within(rows()[1]).getByLabelText('Value 1') as HTMLInputElement;

		type(field, 'Oak');
		await deliver({ ...SAMPLE, properties: [createProperty('ex:first', [{ ...createIriView('ex:A', 'A'), anchor: 5 }]), ...SAMPLE.properties] }, { version: 2 });

		expect(rowLabels().slice(0, 3)).toEqual(['ex:first', 'rdf:type', 'rdfs:label']);
		expect((within(rows()[2]).getByLabelText('Value 1') as HTMLInputElement).value).toBe('Oak');
	});

	it('writes nothing while the data is stale, and writes once it is current', async () => {
		const { host, deliver } = renderList();

		await deliver(SAMPLE, { stale: true });
		type(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);

		expect(host.submitted).toHaveLength(0);

		await deliver({ ...SAMPLE });

		expect(host.submitted).toHaveLength(1);
	});

	it('reads the rows whose values cannot all be kept by their place', () => {
		const detail = createTestResourceDetail([createProperty('ex:p', [createIriView('ex:A', 'A')])]);

		renderList(detail);

		expect(rows()[0].classList.contains('is-editable')).toBe(false);
		expect(rowLabels()[1]).toBe('New statement');
	});

	it('refuses a new statement of a predicate whose row only reads, rather than replacing its values', async () => {
		const detail = createTestResourceDetail([createProperty('ex:p', [createIriView('ex:A', 'A')])]);
		const { host } = renderList(detail);

		await typeNewStatement('ex:p', 'ex:B');

		expect(host.submitted).toEqual([]);
		expect(within(rows()[1]).getByRole('alert').textContent).toMatch(/cannot edit/);
	});
});

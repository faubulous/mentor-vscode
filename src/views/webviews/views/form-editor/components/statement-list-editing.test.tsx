// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RDF, RDFS, XSD } from '@faubulous/mentor-rdf';
import { createEditingHostStub, EditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createSampleCardBody, createTestCardBody, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { renderWebview, typeInto } from '@src/utilities/mocks/webview-test-utils';
import { PredicateData, ResourceCardBodyData } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { StatementList } from './statement-list';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));

/**
 * The statements the tests edit: a type, a label and a subclass statement, each value anchored.
 */
const SAMPLE = withAnchors(createSampleCardBody());

/**
 * Render the statements about a resource, written through a controller over a recording host.
 */
function renderList(cardBody: ResourceCardBodyData = SAMPLE) {
	const host = createEditingHostStub();
	const editing = new EditingController(host);
	const dataService = createResourceDataServiceStub([cardBody]);
	const ui = (current: ResourceCardBodyData, stale = false) => (
		<FormEditorContext.Provider value={{ readOnly: false, editing, namespaces: NAMESPACES, languageTags: {}, resources: [] } satisfies FormEditorContextValue}>
			<StatementList cardBody={current} stale={stale} dataService={dataService} depth={0} visited={[current.subject]} />
		</FormEditorContext.Provider>
	);
	const result = renderWebview(ui(cardBody));

	/**
	 * Deliver the statements as the host does after an edit: for the next version, or stale.
	 */
	const deliver = async (next: ResourceCardBodyData, options: { stale?: boolean; version?: number } = {}) => {
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
function withValues(index: number, values: PredicateData['values']): ResourceCardBodyData {
	return { ...SAMPLE, predicates: SAMPLE.predicates.map((property, position) => position === index ? { ...property, values } : property) };
}

/**
 * Open a row for a new statement with Add property, type a statement into it and leave it.
 */
async function typeNewStatement(predicate: string, value: string): Promise<void> {
	await userEvent.click(screen.getByRole('button', { name: 'Add property' }));

	const row = rows()[rows().length - 1];

	typeInto(within(row).getByLabelText('Predicate'), predicate);
	fireEvent.focusOut(within(row).getByLabelText('Predicate'), { relatedTarget: within(row).getByLabelText('New value') });
	typeInto(within(row).getByLabelText('New value'), value);
	await leave(row);
}

describe('StatementList, edited', () => {
	it('shows each statement as fields, and the link that adds a property after them', () => {
		renderList();

		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf']);
		expect(screen.getByRole('button', { name: 'Add property' })).toBeTruthy();
		expect((within(rows()[1]).getByLabelText('Value 1') as HTMLInputElement).value).toBe('Tree');
		expect(within(rows()[1]).getByText('en', { selector: '.literal-field-tag' })).toBeTruthy();
		expect(within(rows()[1]).getByRole('button', { name: 'en' }).classList.contains('statement-predicate-tag')).toBe(true);
		expect(within(rows()[0]).getByText('Class').closest('.value-pill')).not.toBeNull();
	});

	it('writes an edited literal as a new term among the written values, from the version of the data', async () => {
		const { host } = renderList();

		typeInto(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);

		expect(host.submitted).toEqual([{
			operations: [{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: RdfDataFactory.literal('Oak', 'en') }] }],
			baseVersion: 1
		}]);
	});

	it('writes nothing when a row is left as it was', async () => {
		const { host } = renderList();

		typeInto(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		typeInto(within(rows()[1]).getByLabelText('Value 1'), 'Tree');
		await leave(rows()[1]);

		expect(host.submitted).toEqual([]);
	});

	it('moves a pill one place by Alt and an arrow, writes the new order and keeps the focus on the pill', async () => {
		const { host } = renderList(withAnchors(createTestCardBody([createProperty('rdfs:subClassOf', [createIriView('ex:A', 'A'), createIriView('ex:B', 'B'), createIriView('ex:C', 'C')])])));
		const pill = within(rows()[0]).getByText('C').closest<HTMLElement>('.value-pill')!;

		pill.focus();
		await act(async () => {
			fireEvent.keyDown(pill, { key: 'ArrowLeft', altKey: true });
		});

		expect(host.submitted[0].operations).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, values: [{ kind: 'existing', anchor: 110 }, { kind: 'existing', anchor: 130 }, { kind: 'existing', anchor: 120 }] }]);
		expect(document.activeElement?.textContent).toContain('C');
	});

	it('moves a pill dragged to another place among the pills, and shows where it is dropped', async () => {
		const { host } = renderList(withAnchors(createTestCardBody([createProperty('rdfs:subClassOf', [createIriView('ex:A', 'A'), createIriView('ex:B', 'B'), createIriView('ex:C', 'C')])])));
		const wrapperOf = (label: string) => within(rows()[0]).getByText(label).closest<HTMLElement>('[data-value-index]')!;
		const dataTransfer = { effectAllowed: '', dropEffect: '', setData: () => undefined };

		fireEvent.dragStart(wrapperOf('A'), { dataTransfer });
		// Without a pointer position in jsdom, the drop goes into the gap before the pill under it.
		fireEvent.dragOver(wrapperOf('C'), { dataTransfer });

		expect(wrapperOf('C').classList.contains('is-drop-before')).toBe(true);

		await act(async () => {
			fireEvent.drop(wrapperOf('C'), { dataTransfer });
		});

		expect(host.submitted[0].operations).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, values: [{ kind: 'existing', anchor: 120 }, { kind: 'existing', anchor: 110 }, { kind: 'existing', anchor: 130 }] }]);
		expect(rows()[0].querySelector('.is-drop-before, .is-drop-after')).toBeNull();
	});

	it('adds a typed resource and removes a pill', async () => {
		const { host } = renderList();
		const row = rows()[2];
		const field = within(row).getByLabelText('New value');

		typeInto(field, 'ex:Plant');
		fireEvent.keyDown(field, { key: 'Enter' });
		fireEvent.click(within(row).getByLabelText('Remove Thing'));
		await leave(row);

		expect(host.submitted[0].operations).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, values: [{ kind: 'term', term: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Plant`) }] }]);
	});

	it('shows why a typed value is no term and keeps it', async () => {
		const { host } = renderList();
		const row = rows()[2];
		const field = within(row).getByLabelText('New value') as HTMLInputElement;

		typeInto(field, 'foo:Plant');
		fireEvent.keyDown(field, { key: 'Enter' });

		expect(within(row).getByRole('alert').textContent).toMatch(/'foo' is not declared/);

		await leave(row);

		expect(field.value).toBe('foo:Plant');
		expect(host.submitted).toEqual([]);
	});

	it('shows why a number does not fit its datatype under it, and puts the stored value back when the row is left', async () => {
		const cardBody = withAnchors(createTestCardBody([createProperty('ex:count', [{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true }])]));
		const { host } = renderList(cardBody);
		const field = within(rows()[0]).getByLabelText('Value 1') as HTMLInputElement;

		typeInto(field, '4.5');

		expect(within(rows()[0]).getByText('Not a valid integer — expected 42', { selector: '.literal-field-problem' })).toBeTruthy();
		expect(field.closest('.literal-field')?.classList.contains('is-problem')).toBe(true);
		expect(field.getAttribute('aria-invalid')).toBe('true');

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
		typeInto(predicate, 'rdfs:comment');
		fireEvent.focusOut(predicate, { relatedTarget: within(row).getByLabelText('New value') });

		expect(host.submitted.map(edit => edit.operations[0])).toEqual([{ op: 'setPredicate', subject: TEST_SUBJECT, predicate: RDFS.label, newPredicate: RDFS.comment }]);
	});

	it('keeps the row of a renamed predicate, and its element, when the property arrives under the new name', async () => {
		const { host, deliver } = renderList();
		const row = rows()[1];
		const predicate = within(row).getByLabelText('Predicate');

		fireEvent.focus(predicate);
		typeInto(predicate, 'rdfs:comment');
		fireEvent.focusOut(predicate, { relatedTarget: within(row).getByLabelText('New value') });
		await settle(host);

		const renamed: PredicateData = { ...SAMPLE.predicates[1], predicate: { term: RdfDataFactory.namedNode(RDFS.comment), prefixedName: 'rdfs:comment', editable: true } };

		await deliver({ ...SAMPLE, predicates: [SAMPLE.predicates[0], renamed, SAMPLE.predicates[2]] }, { version: 2 });

		expect(rows()[1]).toBe(row);
		expect(row.getAttribute('aria-label')).toBe('rdfs:comment');
	});

	it('goes on to the field of a new value with Escape in a value, and gives up what was typed with Escape there', async () => {
		const { host } = renderList();
		const field = within(rows()[1]).getByLabelText('Value 1') as HTMLInputElement;

		typeInto(field, 'Oak');
		fireEvent.keyDown(field, { key: 'Escape' });

		expect(field.value).toBe('Oak');

		fireEvent.keyDown(within(rows()[1]).getByLabelText('New value'), { key: 'Escape' });
		await leave(rows()[1]);

		expect(field.value).toBe('Tree');
		expect(host.submitted).toEqual([]);
	});

	it('opens a row for a new statement with Add property, and closes it when it is left empty', async () => {
		renderList();

		await userEvent.click(screen.getByRole('button', { name: 'Add property' }));

		const row = rows()[3];

		expect(row.getAttribute('aria-label')).toBe('New statement');
		expect(screen.queryByRole('button', { name: 'Add property' })).toBeNull();

		await leave(row);

		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf']);
		expect(screen.getByRole('button', { name: 'Add property' })).toBeTruthy();
	});

	it('writes a new statement typed into its row, keeps the row editable until the host shows it, and offers Add property again', async () => {
		const { host, deliver } = renderList();

		await typeNewStatement('rdfs:comment', 'A tree');

		expect(host.submitted[0].operations).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.comment, values: [{ kind: 'term', term: RdfDataFactory.literal('A tree') }] }]);
		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'New statement']);
		expect(screen.getByRole('button', { name: 'Add property' })).toBeTruthy();

		const submitted = rows()[3];

		expect(submitted.classList.contains('is-editable')).toBe(true);

		await settle(host);
		await deliver({ ...SAMPLE, predicates: [...SAMPLE.predicates, { predicate: { term: RdfDataFactory.namedNode(RDFS.comment), prefixedName: 'rdfs:comment', editable: true }, values: [{ ...createLiteralView('A tree'), anchor: 900 }] }] }, { version: 2 });

		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf', 'rdfs:comment']);
		expect(rows()[3]).toBe(submitted);
	});

	it('adds a new statement of a predicate the card shows to the values of that predicate', async () => {
		const { host } = renderList();

		await typeNewStatement('rdfs:label', 'Baum');

		expect(host.submitted[0].operations).toEqual([{
			op: 'setValues',
			subject: TEST_SUBJECT,
			predicate: RDFS.label,
			values: [{ kind: 'existing', anchor: SAMPLE.predicates[1].values[0].anchor }, { kind: 'term', term: RdfDataFactory.literal('Baum') }]
		}]);
		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf']);
	});

	it('keeps a refused new statement editable, with the reason shown under it', async () => {
		const { host } = renderList();

		await typeNewStatement('rdfs:comment', 'A tree');
		await settle(host, { ok: false, problem: { kind: 'invalidIri', iri: 'ex: tree' }, version: 1 });

		const refused = rows()[3];

		expect(refused.classList.contains('is-editable')).toBe(true);
		expect(within(refused).getByRole('alert').textContent).toContain("'ex: tree' is not a valid IRI.");
		expect((within(refused).getByLabelText('Value 1') as HTMLInputElement).value).toBe('A tree');

		fireEvent.click(within(refused).getByLabelText('Dismiss'));

		expect(within(refused).queryByRole('alert')).toBeNull();
	});

	it('holds a second change back until the first one arrives, then writes it against the new anchors', async () => {
		const { host, deliver } = renderList();

		typeInto(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);
		typeInto(within(rows()[1]).getByLabelText('Value 1'), 'Elm');
		await leave(rows()[1]);

		expect(host.submitted).toHaveLength(1);

		await settle(host);

		expect(host.submitted).toHaveLength(1);

		await deliver(withValues(1, [{ ...createLiteralView('Oak', 'en'), anchor: 500 }]), { version: 2 });

		expect(host.submitted).toHaveLength(2);
		expect(host.submitted[1]).toEqual({
			operations: [{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: RdfDataFactory.literal('Elm', 'en') }] }],
			baseVersion: 2
		});
	});

	it('holds the change of another row back until the first edit arrives, so it is built from the new version', async () => {
		const { host, deliver } = renderList();

		typeInto(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);
		typeInto(within(rows()[2]).getByLabelText('New value'), 'ex:Plant');
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

		typeInto(field, 'Oak');
		await deliver({ ...SAMPLE, predicates: [createProperty('ex:first', [{ ...createIriView('ex:A', 'A'), anchor: 5 }]), ...SAMPLE.predicates] }, { version: 2 });

		expect(rowLabels().slice(0, 3)).toEqual(['ex:first', 'rdf:type', 'rdfs:label']);
		expect((within(rows()[2]).getByLabelText('Value 1') as HTMLInputElement).value).toBe('Oak');
	});

	it('writes nothing while the data is stale, and writes once it is current', async () => {
		const { host, deliver } = renderList();

		await deliver(SAMPLE, { stale: true });
		typeInto(within(rows()[1]).getByLabelText('Value 1'), 'Oak');
		await leave(rows()[1]);

		expect(host.submitted).toHaveLength(0);

		await deliver({ ...SAMPLE });

		expect(host.submitted).toHaveLength(1);
	});

	it('reads the rows whose values cannot all be kept by their place', () => {
		const cardBody = createTestCardBody([createProperty('ex:p', [createIriView('ex:A', 'A')])]);

		renderList(cardBody);

		expect(rows()[0].classList.contains('is-editable')).toBe(false);
		expect(rowLabels()).toEqual(['ex:p']);
		expect(screen.getByRole('button', { name: 'Add property' })).toBeTruthy();
	});

	it('refuses a new statement of a predicate whose row only reads, rather than replacing its values', async () => {
		const cardBody = createTestCardBody([createProperty('ex:p', [createIriView('ex:A', 'A')])]);
		const { host } = renderList(cardBody);

		await typeNewStatement('ex:p', 'ex:B');

		expect(host.submitted).toEqual([]);
		expect(within(rows()[1]).getByRole('alert').textContent).toMatch(/cannot edit/);
	});
});

describe('StatementList, moving rows', () => {
	/**
	 * A data transfer as jsdom lacks one: it takes what a drag sets and ignores it.
	 */
	const dataTransfer = { effectAllowed: '', dropEffect: '', setData: () => undefined, setDragImage: () => undefined };

	/**
	 * The grip of a row.
	 */
	function gripOf(row: HTMLElement): HTMLElement {
		return within(row).getByRole('button', { name: /^Move / });
	}

	/**
	 * Press a key on the grip of a row.
	 */
	async function pressOnGrip(row: HTMLElement, key: string): Promise<void> {
		await act(async () => {
			fireEvent.keyDown(gripOf(row), { key });
		});
	}

	it('moves a row one place up or down by the arrows on its grip, and nowhere past the ends', async () => {
		const up = renderList();

		await pressOnGrip(rows()[2], 'ArrowUp');

		expect(up.host.submitted[0].operations).toEqual([{ op: 'moveProperty', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, target: RDFS.label, placement: 'before' }]);

		up.unmount();

		const down = renderList();

		await pressOnGrip(rows()[0], 'ArrowDown');
		await pressOnGrip(rows()[0], 'ArrowUp');

		expect(down.host.submitted.map(request => request.operations)).toEqual([[{ op: 'moveProperty', subject: TEST_SUBJECT, predicate: RDF.type, target: RDFS.label, placement: 'after' }]]);
	});

	it('gives the focus back to the grip once the moved row stands in its new place', async () => {
		const { host, deliver } = renderList();

		gripOf(rows()[2]).focus();
		await pressOnGrip(rows()[2], 'ArrowUp');
		await settle(host);
		await deliver({ ...SAMPLE, predicates: [SAMPLE.predicates[0], SAMPLE.predicates[2], SAMPLE.predicates[1]] }, { version: 2 });

		expect(rowLabels()).toEqual(['rdf:type', 'rdfs:subClassOf', 'rdfs:label']);
		expect(document.activeElement).toBe(gripOf(rows()[1]));
	});

	it('drops a dragged row into the gap nearest the pointer, marks the place, and writes nothing for a drop where it stands', async () => {
		const { host } = renderList();
		const setDragImage = vi.fn();
		const list = document.querySelector<HTMLElement>('.statement-list')!;

		fireEvent.dragStart(gripOf(rows()[0]), { dataTransfer: { ...dataTransfer, setDragImage } });

		// Nothing follows the pointer: the image of the drag is an empty element.
		expect(setDragImage).toHaveBeenCalledWith(expect.any(HTMLElement), 0, 0);
		expect((setDragImage.mock.calls[0][0] as HTMLElement).childNodes.length).toBe(0);

		// Without a layout in jsdom, every height falls into the gap before the first row, where the first row stands.
		fireEvent.dragOver(rows()[2], { dataTransfer });

		expect(document.querySelector('.is-drop-before, .is-drop-after')).toBeNull();

		fireEvent.dragEnd(gripOf(rows()[0]), { dataTransfer });
		fireEvent.dragStart(gripOf(rows()[2]), { dataTransfer });
		fireEvent.dragOver(rows()[1], { dataTransfer });

		expect(rows()[0].classList.contains('is-drop-before')).toBe(true);

		fireEvent.dragLeave(list, { dataTransfer, relatedTarget: document.body });

		expect(rows()[0].classList.contains('is-drop-before')).toBe(false);

		fireEvent.dragOver(rows()[1], { dataTransfer });
		await act(async () => {
			fireEvent.drop(rows()[1], { dataTransfer });
		});

		expect(host.submitted[0].operations).toEqual([{ op: 'moveProperty', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, target: RDF.type, placement: 'before' }]);
		expect(document.querySelector('.is-drop-before, .is-drop-after')).toBeNull();
	});

	it('shows why the host did not move a row', async () => {
		const { host } = renderList();

		await pressOnGrip(rows()[2], 'ArrowUp');
		await settle(host, { ok: false, problem: { kind: 'separateBlocks' }, version: 1 });

		expect(within(rows()[2]).getByRole('alert').textContent).toMatch(/separate blocks/);
	});

	it('has no grip in a row of a new statement', async () => {
		renderList();

		await userEvent.click(screen.getByRole('button', { name: 'Add property' }));

		expect(within(rows()[3]).queryByRole('button', { name: /^Move / })).toBeNull();
		expect(rows().slice(0, 3).every(row => within(row).queryByRole('button', { name: /^Move / }) !== null)).toBe(true);
	});
});

import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { act, render, within } from '@testing-library/react';
import { RDFS, XSD } from '@faubulous/mentor-rdf';
import { createEditingControllerStub } from '@src/utilities/mocks/editing-controller-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, TEST_SUBJECT, createProperty, createSampleResourceDetail, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { ResourceDetail } from '../form-editor-model';
import { FormEditorContext } from '../state/form-editor-context';
import { StatementList } from './statement-list';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri, usageCount: 1 }));
const SAMPLE = withAnchors(createSampleResourceDetail());
const RESOURCES = [createResourceSummary('Plant', { label: 'Plant' }), createResourceSummary('Shrub', { label: 'Shrub' })];

/**
 * Render the edited statements of a detail in the form editor, with a recording controller.
 */
async function renderList(detail: ResourceDetail = SAMPLE) {
	const editing = createEditingControllerStub();
	const result = render(
		<div className="form-editor">
			<FormEditorContext.Provider value={{ readOnly: false, editing, namespaces: NAMESPACES, resources: RESOURCES }}>
				<StatementList detail={detail} dataService={createResourceDataServiceStub([detail])} depth={0} visited={[detail.id]} />
			</FormEditorContext.Provider>
			<button type="button" className="outside">Outside</button>
		</div>
	);

	await Promise.all(Array.from(result.container.querySelectorAll('vscode-textfield')).map(field => (field as unknown as { updateComplete: Promise<unknown> }).updateComplete));

	return { ...result, editing };
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
		const { editing } = await renderList();

		await userEvent.click(within(rows()[1]).getByLabelText('Value 1'));
		await userEvent.keyboard('{End}s');
		await leaveList();

		expect(editing.submitted.map(edit => edit.operations[0])).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: { kind: 'literal', value: 'Trees', language: 'en' } }] }]);
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
		const { editing } = await renderList();

		await userEvent.click(within(rows()[1]).getByRole('button', { name: /^en\./ }));
		await userEvent.keyboard('de{Enter}');

		expect(within(rows()[1]).getByRole('button', { name: /^de\./ })).toBeTruthy();

		await leaveList();

		expect(editing.submitted[0].operations[0]).toEqual({ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: { kind: 'literal', value: 'Tree', language: 'de' } }] });
	});

	it('offers the datatypes a number fits', async () => {
		const detail = withAnchors(createTestResourceDetail([createProperty('ex:count', [{ term: { kind: 'literal', value: '42', datatype: XSD.integer }, editable: true }])]));

		await renderList(detail);
		await userEvent.click(within(rows()[0]).getByRole('button', { name: /^Integer\./ }));

		expect(Array.from(rows()[0].querySelectorAll('.combobox-option-label')).map(option => option.textContent)).toEqual([]);

		await userEvent.keyboard('{ArrowDown}');

		expect(Array.from(rows()[0].querySelectorAll('.combobox-option-label')).map(option => option.textContent)).toEqual(['Text', 'Integer', 'Decimal', 'Double', 'Float', 'Markdown']);
	});

	it('steps a whole number with the arrows', async () => {
		const detail = withAnchors(createTestResourceDetail([createProperty('ex:count', [{ term: { kind: 'literal', value: '42', datatype: XSD.integer }, editable: true }])]));
		const field = (await renderList(detail), within(rows()[0]).getByLabelText('Value 1'));

		await userEvent.click(field);
		await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}');

		expect((field as unknown as { value: string }).value).toBe('43');
	});

	it('shows why a number does not fit its datatype in place of its tag, and writes nothing', async () => {
		const detail = withAnchors(createTestResourceDetail([createProperty('ex:count', [{ term: { kind: 'literal', value: '42', datatype: XSD.integer }, editable: true }])]));
		const { editing } = await renderList(detail);

		await userEvent.click(within(rows()[0]).getByLabelText('Value 1'));
		await userEvent.keyboard('{End}.5{Enter}');

		expect(within(rows()[0]).getByRole('button', { name: /Whole numbers/ })).toBeTruthy();
		expect(editing.submitted).toEqual([]);
	});

	it('draws the box of a field only on intent', async () => {
		await renderList();

		const field = within(rows()[1]).getByLabelText('Value 1');
		const border = (): string => getComputedStyle(field).getPropertyValue('--vscode-settings-textInputBorder').trim();

		expect(border()).toBe('transparent');

		await userEvent.hover(field);

		expect(border()).not.toBe('transparent');
	});

	it('adds a new statement typed into its row', async () => {
		const { editing } = await renderList();
		const row = rows()[3];

		await userEvent.click(within(row).getByLabelText('Predicate'));
		await userEvent.keyboard('rdfs:seeAlso');
		await userEvent.click(within(row).getByLabelText('New value'));
		await userEvent.keyboard('ex:Plant{Enter}');
		await leaveList();

		expect(editing.submitted.map(edit => edit.operations[0])).toEqual([{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.seeAlso, values: [{ kind: 'term', term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Plant` } }] }]);
	});
});

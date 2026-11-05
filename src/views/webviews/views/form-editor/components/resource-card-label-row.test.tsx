// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { RDFS, SKOS } from '@faubulous/mentor-rdf';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PropertyView } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));

const SUMMARY = createResourceSummary('Tree', { term: TEST_SUBJECT, label: 'Tree', usageCount: 3 });

/**
 * Render the expanded card of a resource with the given properties, edited, with `rdfs:label` and
 * `skos:prefLabel` as the label predicates.
 * @param properties The properties of the resource.
 */
function renderCard(properties: PropertyView[]) {
	const host = createEditingHostStub();
	const detail = withAnchors(createTestResourceDetail(properties));
	const context: FormEditorContextValue = {
		readOnly: false,
		editing: new EditingController(host),
		namespaces: NAMESPACES,
		languageTags: {},
		resources: [],
		labelPredicates: [RdfDataFactory.namedNode(RDFS.label), RdfDataFactory.namedNode(SKOS.prefLabel)]
	};

	renderWebview(
		<FormEditorContext.Provider value={context}>
			<ResourceCard summary={SUMMARY} dataService={createResourceDataServiceStub([detail])} expanded onToggle={() => undefined} />
		</FormEditorContext.Provider>
	);

	return { host, labelRow: screen.getByRole('group', { name: 'Label' }) };
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

describe('ResourceCard, its label row', () => {
	it('writes the title typed into the label row as the label', async () => {
		const { host, labelRow } = renderCard([createProperty('rdfs:label', [createLiteralView('Tree')]), createProperty('ex:p', [createIriView('ex:A', 'A')])]);
		const title = within(labelRow).getByLabelText('Value 1');

		type(title, 'Oak');
		await leave(title);

		expect(host.submitted.map(record => record.operations)).toEqual([[{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: RdfDataFactory.literal('Oak') }] }]]);
	});

	it('writes the label with another label predicate picked from the menu of the label row', async () => {
		const { host, labelRow } = renderCard([createProperty('rdfs:label', [createLiteralView('Tree')])]);

		await act(async () => {
			labelRow.querySelector('vscode-context-menu')!.dispatchEvent(new CustomEvent('vsc-context-menu-select', { detail: { value: SKOS.prefLabel } }));
		});

		expect(host.submitted.map(record => record.operations)).toEqual([[{ op: 'setPredicate', subject: TEST_SUBJECT, predicate: RDFS.label, newPredicate: SKOS.prefLabel }]]);
	});

	it('asks for the label of a resource without one, and writes it with the most preferred label predicate', async () => {
		const { host, labelRow } = renderCard([createProperty('ex:p', [createIriView('ex:A', 'A')])]);
		const input = within(labelRow).getByLabelText('New value');

		expect(input.getAttribute('placeholder')).toBe('Add label');

		type(input, 'Oak');
		await leave(input);

		expect(host.submitted.map(record => record.operations)).toEqual([[{ op: 'setValues', subject: TEST_SUBJECT, predicate: RDFS.label, values: [{ kind: 'term', term: RdfDataFactory.literal('Oak') }] }]]);
	});
});

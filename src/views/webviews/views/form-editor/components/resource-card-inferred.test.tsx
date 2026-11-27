// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { RDFS } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceListItem } from '@src/utilities/mocks/resource-list-item-fixtures';
import { TEST_NAMESPACES, TEST_SUBJECT, createIriView, createProperty, createSampleCardBody, createTestCardBody, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { ResourceCardBodyData, TermData } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';
import { ResourceCardTitleBar } from './resource-card-title-bar';
import { CompactResourceCard } from './compact-resource-card';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));

const TREE = createResourceListItem('Tree', { subject: TEST_SUBJECT, typeLabels: ['Class'], inferredTypeLabels: ['Named individual'] });

/**
 * A value the reasoner infers.
 * @param prefixedName The prefixed name of the value.
 * @param label The label of the value.
 * @returns The value.
 */
function inferredView(prefixedName: string, label: string): TermData {
	return { ...createIriView(prefixedName, label), editable: false, inferred: true };
}

/**
 * The statements of the tree, written and anchored, with a type and a property the reasoner infers.
 */
function cardBodyWithInferences(): ResourceCardBodyData {
	const [types, ...others] = withAnchors(createSampleCardBody()).predicates;

	return createTestCardBody([
		{ ...types, values: [...types.values, inferredView('owl:NamedIndividual', 'Named individual')] },
		...others,
		createProperty('rdfs:seeAlso', [inferredView('ex:Oak', 'Oak')])
	]);
}

/**
 * Render the expanded card of the tree, editable or not, with the inferred statements shown or not.
 * @param context The fields of the context.
 */
function renderCard(context: Partial<FormEditorContextValue> = {}) {
	const dataService = createResourceDataServiceStub([cardBodyWithInferences()]);

	return renderWebview(
		<FormEditorContext.Provider value={{ readOnly: true, namespaces: NAMESPACES, languageTags: {}, labelPredicates: [RdfDataFactory.namedNode(RDFS.label)], ...context }}>
			<ResourceCard cardHeader={TREE} dataService={dataService} expanded onToggle={() => undefined} />
		</FormEditorContext.Provider>
	);
}

/**
 * The row of a predicate.
 * @param label The label of the row.
 * @returns The row.
 */
function rowOf(label: string): HTMLElement {
	return screen.getByRole('group', { name: label });
}

describe('ResourceCard, with the statements the reasoner infers', () => {
	it('shows an inferred value in italics after the asserted values of its row, and a property only inferred', () => {
		renderCard();

		const pills = Array.from(rowOf('rdf:type').querySelectorAll('.value-pill'));

		expect(pills.map(pill => [pill.textContent, pill.classList.contains('is-inferred')])).toEqual([['Class', false], ['Named individual', true]]);
		expect(rowOf('rdfs:seeAlso').querySelector('.value-pill.is-inferred')?.textContent).toBe('Oak');
	});

	it('edits the asserted values of a row next to an inferred one, which only reads', () => {
		const editing = new EditingController(createEditingHostStub());

		renderCard({ readOnly: false, editing, resources: [] });

		const types = rowOf('rdf:type');
		const inferred = within(types).getByText('Named individual').closest('.value-pill')!;

		expect(types.classList.contains('is-editable')).toBe(true);
		expect(screen.getByRole('button', { name: 'Remove Class' })).toBeTruthy();
		expect(inferred.classList.contains('is-inferred')).toBe(true);
		expect(inferred.querySelector('.value-pill-remove')).toBeNull();
		expect(inferred.closest('.resource-values')).toBe(types.querySelector('.resource-values'));
		expect(rowOf('rdfs:seeAlso').classList.contains('is-editable')).toBe(false);
	});

	it('shows the inferred type of an untyped nested node as a pill that is no link, as those edited are not', () => {
		const editing = new EditingController(createEditingHostStub());
		const node = RdfDataFactory.blankNode('n0');
		const nodeBody: ResourceCardBodyData = { subject: node, predicates: [createProperty('rdf:type', [inferredView('owl:Class', 'Class')]), ...withAnchors(createTestCardBody([createProperty('rdfs:label', [{ term: RdfDataFactory.literal('Node'), editable: true }])])).predicates] };
		const outer = withAnchors(createTestCardBody([createProperty('ex:part', [{ term: node, editable: true, nested: { term: node, propertyCount: 2 } }])]));
		const dataService = createResourceDataServiceStub([outer, nodeBody]);

		renderWebview(
			<FormEditorContext.Provider value={{ readOnly: false, editing, resources: [], namespaces: NAMESPACES, languageTags: {} }}>
				<ResourceCard cardHeader={TREE} dataService={dataService} expanded onToggle={() => undefined} />
			</FormEditorContext.Provider>
		);

		const pill = screen.getByText('Class').closest('.value-pill')!;

		expect(pill.classList.contains('is-inferred')).toBe(true);
		expect(pill.getAttribute('role')).toBeNull();
	});

	it('leaves the inferred values and the properties only inferred out where the view hides them', () => {
		renderCard({ showInferred: false });

		expect(within(rowOf('rdf:type')).queryByText('Named individual')).toBeNull();
		expect(screen.queryByRole('group', { name: 'rdfs:seeAlso' })).toBeNull();
	});
});

describe('ResourceCardTitleBar, with the types the reasoner infers', () => {
	/**
	 * Render the title bar of the collapsed card of the tree.
	 * @param showInferred Whether the view shows what is inferred.
	 * @returns The types of the title bar.
	 */
	function typesOf(showInferred: boolean): HTMLElement {
		const { container } = renderWebview(
			<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {}, showInferred }}>
				<ResourceCardTitleBar cardHeader={TREE} expanded={false} nestedCollapsed={false} onToggle={() => undefined} onToggleNested={() => undefined} menuRef={{ current: null }} />
			</FormEditorContext.Provider>
		);

		return container.querySelector<HTMLElement>('.resource-card-types')!;
	}

	it('names the inferred types after the asserted ones, in italics', () => {
		const types = typesOf(true);

		expect(types.textContent).toBe('Class, Named individual');
		expect(types.querySelector('.is-inferred')?.textContent).toBe('Named individual');
	});

	it('names the asserted types only where the view hides what is inferred', () => {
		expect(typesOf(false).textContent).toBe('Class');
	});
});

describe('CompactResourceCard, with the statements the reasoner infers', () => {
	/**
	 * Render the compact card of the tree, whose pinned property the reasoner infers.
	 * @param showInferred Whether the view shows what is inferred.
	 * @returns The card.
	 */
	function compactCardOf(showInferred: boolean): HTMLElement {
		const pins = [{ predicate: RdfDataFactory.namedNode(RDFS.seeAlso), scope: 'workspace' as const }];
		const dataService = createResourceDataServiceStub([cardBodyWithInferences()]);
		const { container } = renderWebview(
			<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {}, showInferred }}>
				<CompactResourceCard cardHeader={{ ...TREE, pins }} dataService={dataService} />
			</FormEditorContext.Provider>
		);

		return container.querySelector<HTMLElement>('.resource-card.is-compact')!;
	}

	it('shows the inferred types and the inferred values of the pinned properties in italics', () => {
		const card = compactCardOf(true);

		expect(card.querySelector('.compact-card-types .is-inferred')?.textContent).toBe('Named individual');
		expect(card.querySelector('.pinned-property-values .value-pill.is-inferred')?.textContent).toBe('Oak');
	});

	it('leaves them out where the view hides what is inferred', () => {
		const card = compactCardOf(false);

		expect(card.querySelector('.compact-card-types')?.textContent).toBe('Class');
		expect(card.querySelector('.pinned-properties-list')).toBeNull();
	});
});

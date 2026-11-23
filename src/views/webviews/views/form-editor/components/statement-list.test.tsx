// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OWL, RDFS, XSD, _XSD } from '@faubulous/mentor-rdf';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceListItem } from '@src/utilities/mocks/resource-list-item-fixtures';
import { createIriView, createLiteralView, createProperty, createSampleCardBody, createTestCardBody } from '@src/utilities/mocks/statement-fixtures';
import { EXAMPLE_NAMESPACE } from '@src/utilities/mocks/statement-fixtures';
import { ResourceCardBodyData, TermData } from '../form-editor-model';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { StatementList } from './statement-list';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

/**
 * The view of a blank node value with its nested node.
 */
function createNestedView(id: string, extra: Partial<NonNullable<TermData['nested']>> = {}): TermData {
	return { term: RdfDataFactory.blankNode(id), editable: true, nested: { term: RdfDataFactory.blankNode(id), propertyCount: 1, ...extra } };
}

/**
 * Render the statements about a resource within a context, with those about others at hand.
 */
function renderList(cardBody: ResourceCardBodyData, context: Partial<FormEditorContextValue> = {}, others: ResourceCardBodyData[] = []) {
	const dataService = createResourceDataServiceStub([cardBody, ...others]);
	const result = renderWebview(
		<FormEditorContext.Provider value={{ readOnly: true, namespaces: [{ prefix: 'xsd', iri: _XSD }], languageTags: {}, ...context }}>
			<StatementList cardBody={cardBody} dataService={dataService} depth={0} visited={[cardBody.subject]} />
		</FormEditorContext.Provider>
	);

	return { ...result, dataService };
}

describe('StatementList', () => {
	it('shows each property as a row with its predicate label, resources as pills and literals as text', () => {
		renderList(createSampleCardBody());

		expect(screen.getAllByRole('group').map(row => row.getAttribute('aria-label'))).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf']);
		expect(screen.getByText('Class').closest('.value-pill')?.getAttribute('data-tooltip-iri')).toBe(OWL.Class);
		expect(screen.getByText('Tree').classList.contains('literal-text')).toBe(true);
		expect(screen.getByText('en', { selector: '.literal-annotation' })).toBeTruthy();
		expect(screen.getByText('en', { selector: '.statement-predicate-annotation' })).toBeTruthy();
	});

	it('shows the datatype of a literal as an annotation by its name, XSD ones without their prefix, and none for a plain string', () => {
		const cardBody = createTestCardBody([createProperty('ex:p', [
			{ term: RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), editable: true },
			{ term: RdfDataFactory.literal('plain', RdfDataFactory.namedNode(XSD.string)), editable: true }
		])]);

		renderList(cardBody);

		expect(screen.getByText('integer', { selector: '.literal-annotation' })).toBeTruthy();
		expect(screen.getAllByText(/./, { selector: '.literal-annotation' })).toHaveLength(1);
	});

	it('puts the comment lines of a property under its values, and those of a later value above the value', () => {
		const cardBody = createTestCardBody([
			{ ...createProperty('rdfs:label', [createLiteralView('First'), { ...createLiteralView('Second'), comments: ['about the second'] }]), comments: ['what it is called', 'two lines'] }
		]);

		renderList(cardBody);

		const comment = screen.getByText('what it is called two lines', { normalizer: text => text.replace(/\s+/g, ' ') });

		expect(comment.classList.contains('statement-comment')).toBe(true);
		expect(comment.closest('.statement-values')?.lastElementChild).toBe(comment);
		expect(screen.getByText('about the second').classList.contains('statement-value-comment')).toBe(true);
	});

	it('follows a pill to the card of a resource the document describes, and out of the editor otherwise', async () => {
		const onRevealResource = vi.fn();
		const onOpenExternal = vi.fn();
		const cardBody = createTestCardBody([createProperty('rdfs:subClassOf', [createIriView('ex:Plant', 'Plant'), createIriView('owl:Thing', 'Thing')])]);

		renderList(cardBody, { resources: [createResourceListItem('Plant')], onRevealResource, onOpenExternal });

		await userEvent.click(screen.getByText('Plant'));
		await userEvent.click(screen.getByText('Thing'));

		expect(onRevealResource).toHaveBeenCalledWith(RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Plant`));
		expect(onOpenExternal).toHaveBeenCalledWith(OWL.Thing);
	});

	it('shows the items of a list on lines of their own', () => {
		const list: TermData = { term: RdfDataFactory.blankNode('l1'), editable: true, collection: { items: [createIriView('ex:A', 'A'), createLiteralView('b')] } };

		renderList(createTestCardBody([createProperty('owl:unionOf', [list])]));

		expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['A', 'b']);
	});

	it('renders the card of a blank node in place of its value, collapsed to its header with the comments above the value and the node, and asks for one it does not hold', async () => {
		const nestedCardBody: ResourceCardBodyData = { subject: RdfDataFactory.blankNode('b1'), leadingComments: ['the node'], predicates: [createProperty('rdfs:comment', [createLiteralView('inside')])] };
		const cardBody = createTestCardBody([createProperty('ex:has', [{ ...createNestedView('b1'), comments: ['the value'] }, createNestedView('b2')])]);
		const { dataService } = renderList(cardBody, {}, [nestedCardBody]);

		expect(screen.queryByText('inside')).toBeNull();

		await userEvent.click(screen.getByRole('button', { name: 'Expand' }));

		expect(screen.getByText('inside').closest('.resource-card.is-nested')?.getAttribute('data-resource-id')).toBe('_:b1');
		expect(screen.getByText('the value the node', { normalizer: text => text.replace(/\s+/g, ' ') }).classList.contains('nested-card-caption')).toBe(true);
		expect(screen.getByText(/the node/).closest('.statement-line')?.getAttribute('aria-label')).toBe('Type');
		expect(screen.queryByText('the value', { selector: '.statement-value-comment' })).toBeNull();
		expect(screen.getByText('Loading…').closest('.resource-card.is-nested')?.getAttribute('data-resource-id')).toBe('_:b2');
		expect(dataService.requested).toEqual([RdfDataFactory.blankNode('b2')]);
		expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
	});

	it('stands in for a node beyond the nesting limit and for one that holds the list already', async () => {
		const onRevealResource = vi.fn();
		const deep = createNestedView('deep', { label: 'Opening hours', propertyCount: 2 });
		const back = createNestedView(RDFS.label);
		const cardBody = createTestCardBody([createProperty('ex:has', [deep, back])]);
		const dataService = createResourceDataServiceStub([cardBody]);

		renderWebview(
			<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {}, onRevealResource }}>
				<StatementList cardBody={cardBody} dataService={dataService} depth={3} visited={[cardBody.subject, RdfDataFactory.blankNode(RDFS.label)]} />
			</FormEditorContext.Provider>
		);

		await userEvent.click(screen.getByRole('button', { name: 'Expand' }));
		await userEvent.click(screen.getByTitle('Show this blank node'));

		expect(screen.getByTitle('Show this blank node').textContent).toContain('[ Opening hours · 2 properties ]');
		expect(onRevealResource).toHaveBeenCalledWith(RdfDataFactory.blankNode('deep'));
		expect(document.querySelectorAll('.resource-card.is-nested')).toHaveLength(0);
	});
});

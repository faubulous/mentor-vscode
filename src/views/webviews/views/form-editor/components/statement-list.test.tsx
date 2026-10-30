// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OWL, RDFS, XSD } from '@faubulous/mentor-rdf';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { createIriView, createLiteralView, createProperty, createSampleResourceDetail, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { EXAMPLE_NAMESPACE } from '@src/utilities/mocks/statement-fixtures';
import { ResourceDetail, TermView } from '../form-editor-model';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { StatementList } from './statement-list';

/**
 * The view of a blank node value with its nested node.
 */
function createNestedView(id: string, extra: Partial<NonNullable<TermView['nested']>> = {}): TermView {
	return { term: { kind: 'bnode', id }, editable: true, nested: { id: `b:${id}`, propertyCount: 1, iconName: 'mentor-rdf-individual', ...extra } };
}

/**
 * Render the statements of a detail within a context, with the given details at hand.
 */
function renderList(detail: ResourceDetail, context: Partial<FormEditorContextValue> = {}, details: ResourceDetail[] = []) {
	const dataService = createResourceDataServiceStub([detail, ...details]);
	const result = renderWebview(
		<FormEditorContext.Provider value={{ readOnly: true, namespaces: [{ prefix: 'xsd', iri: 'http://www.w3.org/2001/XMLSchema#', usageCount: 1 }], ...context }}>
			<StatementList detail={detail} dataService={dataService} depth={0} visited={[detail.id]} />
		</FormEditorContext.Provider>
	);

	return { ...result, dataService };
}

describe('StatementList', () => {
	it('shows each property as a row with its predicate label, resources as pills and literals as text', () => {
		renderList(createSampleResourceDetail());

		expect(screen.getAllByRole('group').map(row => row.getAttribute('aria-label'))).toEqual(['rdf:type', 'rdfs:label', 'rdfs:subClassOf']);
		expect(screen.getByText('Class').closest('.value-pill')?.getAttribute('title')).toBe(OWL.Class);
		expect(screen.getByText('Tree').classList.contains('literal-text')).toBe(true);
		expect(screen.getByText('en').classList.contains('literal-tag')).toBe(true);
	});

	it('shows the datatype of a literal as a tag by its prefix, and none for a plain string', () => {
		const detail = createTestResourceDetail([createProperty('ex:p', [
			{ term: { kind: 'literal', value: '42', datatype: XSD.integer }, editable: true },
			{ term: { kind: 'literal', value: 'plain', datatype: XSD.string }, editable: true }
		])]);

		renderList(detail);

		expect(screen.getByText('xsd:integer').classList.contains('literal-tag')).toBe(true);
		expect(screen.getAllByText(/./, { selector: '.literal-tag' })).toHaveLength(1);
	});

	it('puts the comment lines above their property and above a later value', () => {
		const detail = createTestResourceDetail([
			{ ...createProperty('rdfs:label', [createLiteralView('First'), { ...createLiteralView('Second'), comments: ['about the second'] }]), comments: ['what it is called', 'two lines'] }
		]);

		renderList(detail);

		expect(screen.getByText('what it is called two lines', { normalizer: text => text.replace(/\s+/g, ' ') }).classList.contains('statement-comment')).toBe(true);
		expect(screen.getByText('about the second').classList.contains('statement-value-comment')).toBe(true);
	});

	it('follows a pill to the card of a resource the document describes, and out of the editor otherwise', async () => {
		const onRevealResource = vi.fn();
		const onOpenExternal = vi.fn();
		const detail = createTestResourceDetail([createProperty('rdfs:subClassOf', [createIriView('ex:Plant', 'Plant'), createIriView('owl:Thing', 'Thing')])]);

		renderList(detail, { resources: [createResourceSummary('Plant')], onRevealResource, onOpenExternal });

		await userEvent.click(screen.getByText('Plant'));
		await userEvent.click(screen.getByText('Thing'));

		expect(onRevealResource).toHaveBeenCalledWith(`i:${EXAMPLE_NAMESPACE}Plant`);
		expect(onOpenExternal).toHaveBeenCalledWith(OWL.Thing);
	});

	it('shows the items of a list on lines of their own', () => {
		const list: TermView = { term: { kind: 'bnode', id: 'l1' }, editable: true, collection: { items: [createIriView('ex:A', 'A'), createLiteralView('b')] } };

		renderList(createTestResourceDetail([createProperty('owl:unionOf', [list])]));

		expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['A', 'b']);
	});

	it('renders the card of a blank node in place of its value, with the comments of the node, and asks for one it does not hold', () => {
		const nestedDetail: ResourceDetail = { id: 'b:b1', term: { kind: 'bnode', id: 'b1' }, comments: ['the node'], properties: [createProperty('rdfs:comment', [createLiteralView('inside')])] };
		const detail = createTestResourceDetail([createProperty('ex:has', [createNestedView('b1'), createNestedView('b2')])]);
		const { dataService } = renderList(detail, {}, [nestedDetail]);

		expect(screen.getByText('inside').closest('.resource-card.is-nested')?.getAttribute('data-resource-id')).toBe('b:b1');
		expect(screen.getByText('the node').classList.contains('statement-comment')).toBe(true);
		expect(screen.getByText('Loading…').closest('.resource-card.is-nested')?.getAttribute('data-resource-id')).toBe('b:b2');
		expect(dataService.requested).toEqual(['b:b2']);
	});

	it('stands in for a node beyond the nesting limit and for one that holds the list already', async () => {
		const onRevealResource = vi.fn();
		const deep = createNestedView('deep', { label: 'Opening hours', propertyCount: 2 });
		const back = createNestedView(RDFS.label);
		const detail = createTestResourceDetail([createProperty('ex:has', [deep, back])]);
		const dataService = createResourceDataServiceStub([detail]);

		renderWebview(
			<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], onRevealResource }}>
				<StatementList detail={detail} dataService={dataService} depth={3} visited={[detail.id, `b:${RDFS.label}`]} />
			</FormEditorContext.Provider>
		);

		await userEvent.click(screen.getByTitle('Show this blank node'));

		expect(screen.getByTitle('Show this blank node').textContent).toContain('[ Opening hours · 2 properties ]');
		expect(onRevealResource).toHaveBeenCalledWith('b:deep');
		expect(document.querySelectorAll('.resource-card.is-nested')).toHaveLength(0);
	});
});

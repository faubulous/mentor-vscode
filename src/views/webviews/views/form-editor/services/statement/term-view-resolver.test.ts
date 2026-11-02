import { describe, expect, it } from 'vitest';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, createIriView } from '@src/utilities/mocks/statement-fixtures';
import { TermViewResolver } from './term-view-resolver';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

describe('TermViewResolver', () => {
	const resolver = new TermViewResolver(TEST_NAMESPACES, [createResourceSummary('Tree', { label: 'Apple tree', iconName: 'mentor-rdf-class' })], [createIriView('ex:Plant', 'Plant')]);

	it('gives a term the view the card knows, else that of a resource of the document', () => {
		expect(resolver.viewOf(RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Plant`))).toMatchObject({ label: 'Plant', prefixedName: 'ex:Plant' });
		expect(resolver.viewOf(RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Tree`))).toMatchObject({ label: 'Apple tree', iconName: 'mentor-rdf-class' });
	});

	it('names any other IRI by its prefixed name, and carries no position', () => {
		const view = resolver.viewOf(RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Other`));

		expect(view).toEqual({ term: RdfDataFactory.namedNode(`${EXAMPLE_NAMESPACE}Other`), prefixedName: 'ex:Other', label: undefined, labelLanguage: undefined, iconName: undefined, editable: false });
		expect(resolver.viewOf(RdfDataFactory.namedNode('http://nowhere.org/x')).prefixedName).toBeUndefined();
		expect(resolver.viewOf(RdfDataFactory.literal('x'))).toEqual({ term: RdfDataFactory.literal('x'), editable: false });
	});
});

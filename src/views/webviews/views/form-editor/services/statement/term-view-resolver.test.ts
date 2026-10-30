import { describe, expect, it } from 'vitest';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { EXAMPLE_NAMESPACE, TEST_NAMESPACES, createIriView } from '@src/utilities/mocks/statement-fixtures';
import { TermViewResolver } from './term-view-resolver';

describe('TermViewResolver', () => {
	const resolver = new TermViewResolver(TEST_NAMESPACES, [createResourceSummary('Tree', { label: 'Apple tree', iconName: 'mentor-rdf-class' })], [createIriView('ex:Plant', 'Plant')]);

	it('gives a term the view the card knows, else that of a resource of the document', () => {
		expect(resolver.viewOf({ kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Plant` })).toMatchObject({ label: 'Plant', prefixedName: 'ex:Plant' });
		expect(resolver.viewOf({ kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Tree` })).toMatchObject({ label: 'Apple tree', iconName: 'mentor-rdf-class' });
	});

	it('names any other IRI by its prefixed name, and carries no position', () => {
		const view = resolver.viewOf({ kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Other` });

		expect(view).toEqual({ term: { kind: 'iri', iri: `${EXAMPLE_NAMESPACE}Other` }, prefixedName: 'ex:Other', label: undefined, labelLanguage: undefined, iconName: undefined, editable: false });
		expect(resolver.viewOf({ kind: 'iri', iri: 'http://nowhere.org/x' }).prefixedName).toBeUndefined();
		expect(resolver.viewOf({ kind: 'literal', value: 'x' })).toEqual({ term: { kind: 'literal', value: 'x' }, editable: false });
	});
});

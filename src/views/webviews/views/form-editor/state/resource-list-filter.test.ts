import { describe, expect, it } from 'vitest';
import { ResourceSummary } from '../form-editor-model';
import { ResourceListFilter } from './resource-list-filter';

/**
 * Build a resource summary.
 */
function summaryOf(iri: string, label: string, options: { prefixedName?: string; description?: string; externalDeclaration?: boolean } = {}): ResourceSummary {
	return { id: `i:${iri}`, term: { kind: 'iri', iri }, label, iconName: '', propertyCount: 1, hasLabel: false, ...options };
}

const TREE = summaryOf('http://example.org/Tree', 'Tree', { prefixedName: 'ex:Tree', description: 'A woody plant.' });
const LEAF = summaryOf('http://example.org/Leaf', 'Blatt', { prefixedName: 'ex:Leaf' });
const THING = summaryOf('http://www.w3.org/2002/07/owl#Thing', 'owl:Thing', { externalDeclaration: true });
const RESOURCES = [TREE, THING, LEAF];

describe('ResourceListFilter', () => {
	it('returns the same list when nothing narrows it', () => {
		expect(new ResourceListFilter().apply(RESOURCES)).toBe(RESOURCES);
		expect(new ResourceListFilter({ text: '  ' }).apply(RESOURCES)).toBe(RESOURCES);
		expect(new ResourceListFilter({ text: '  ' }).hasText).toBe(false);
	});

	it('matches the label, the description, the prefixed name and the IRI, ignoring case', () => {
		const matches = (text: string, resource: ResourceSummary) => new ResourceListFilter({ text }).matches(resource);

		expect(matches('blatt', LEAF)).toBe(true);
		expect(matches('EX:LEAF', LEAF)).toBe(true);
		expect(matches('example.org/Le', LEAF)).toBe(true);
		expect(matches('woody', TREE)).toBe(true);
		expect(matches('tree', LEAF)).toBe(false);
		expect(new ResourceListFilter({ text: 'leaf' }).apply(RESOURCES)).toEqual([LEAF]);
	});

	it('keeps the resources the tree lists under the node, in document order', () => {
		const filter = new ResourceListFilter({ type: { label: 'Plants', resourceIds: new Set([LEAF.id, TREE.id]) } });

		expect(filter.apply(RESOURCES)).toEqual([TREE, LEAF]);
	});

	it('leaves out the declared terms of other vocabularies when hidden', () => {
		expect(new ResourceListFilter({ hideExternalDeclarations: true }).apply(RESOURCES)).toEqual([TREE, LEAF]);
	});

	it('narrows by every criterion at once', () => {
		const filter = new ResourceListFilter({ text: 'e', type: { label: 'Plants', resourceIds: new Set([TREE.id, THING.id]) }, hideExternalDeclarations: true });

		expect(filter.apply(RESOURCES)).toEqual([TREE]);
	});
});

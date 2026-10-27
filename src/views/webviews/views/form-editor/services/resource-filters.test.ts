import { describe, expect, it } from 'vitest';
import { ResourceSummary } from '../form-editor-model';
import { withoutExternalDeclarations } from './declaration-filter';
import { filterResourcesByText, isFiltering, matchesResourceFilter } from './resource-filter';
import { filterResourcesByType } from './type-filter';

/**
 * Build a resource summary.
 */
function summaryOf(iri: string, label: string, options: { prefixedName?: string; description?: string; externalDeclaration?: boolean } = {}): ResourceSummary {
	return { id: `i:${iri}`, term: { kind: 'iri', iri }, label, iconName: '', propertyCount: 1, valueCount: 1, hasLabel: false, nested: false, ...options };
}

const TREE = summaryOf('http://example.org/Tree', 'Tree', { prefixedName: 'ex:Tree', description: 'A woody plant.' });
const LEAF = summaryOf('http://example.org/Leaf', 'Blatt', { prefixedName: 'ex:Leaf' });
const THING = summaryOf('http://www.w3.org/2002/07/owl#Thing', 'owl:Thing', { externalDeclaration: true });

describe('withoutExternalDeclarations', () => {
	it('leaves out the declared terms of other vocabularies when hidden, and keeps every resource otherwise', () => {
		const resources = [TREE, THING];

		expect(withoutExternalDeclarations(resources, true)).toEqual([TREE]);
		expect(withoutExternalDeclarations(resources, false)).toBe(resources);
	});
});

describe('filterResourcesByType', () => {
	it('keeps the resources the tree lists under the node, in document order', () => {
		const filter = { label: 'Plants', resourceIds: new Set([LEAF.id, TREE.id]) };

		expect(filterResourcesByType([TREE, THING, LEAF], filter)).toEqual([TREE, LEAF]);
	});

	it('keeps every resource without a filter', () => {
		const resources = [TREE, LEAF];

		expect(filterResourcesByType(resources, undefined)).toBe(resources);
	});
});

describe('text filter', () => {
	it('tells a blank filter from one with text', () => {
		expect(isFiltering('')).toBe(false);
		expect(isFiltering('   ')).toBe(false);
		expect(isFiltering('a')).toBe(true);
	});

	it('matches the label, the description, the prefixed name and the IRI, ignoring case', () => {
		expect(matchesResourceFilter(LEAF, 'blatt')).toBe(true);
		expect(matchesResourceFilter(LEAF, 'EX:LEAF')).toBe(true);
		expect(matchesResourceFilter(LEAF, 'example.org/Le')).toBe(true);
		expect(matchesResourceFilter(TREE, 'woody')).toBe(true);
		expect(matchesResourceFilter(LEAF, 'tree')).toBe(false);
		expect(matchesResourceFilter(LEAF, ' ')).toBe(true);
	});

	it('keeps only the matching resources in order, and the same list for a blank filter', () => {
		const resources = [TREE, LEAF];

		expect(filterResourcesByText(resources, '')).toBe(resources);
		expect(filterResourcesByText(resources, 'e')).toEqual([TREE, LEAF]);
		expect(filterResourcesByText(resources, 'leaf')).toEqual([LEAF]);
	});
});

import { describe, expect, it } from 'vitest';
import { OwlReasoner, RDFS, Store, _OWL, _RDFS, _SH, _XSD } from '@faubulous/mentor-rdf';
import { PropertyShapeIndex } from './property-shape-index';
import { TermFitResolver } from './term-fit-resolver';

const V = 'http://example.org/vocabulary#';

const SCHEMA = 'https://schema.org/';

const PREAMBLE = `@prefix v: <${V}> .\n@prefix owl: <${_OWL}> .\n@prefix rdfs: <${_RDFS}> .\n@prefix xsd: <${_XSD}> .\n@prefix sh: <${_SH}> .\n@prefix schema: <${SCHEMA}> .\n`;

/**
 * A resolver over a vocabulary of plants with domains, a superclass, a schema.org domain, a shape
 * of trees, and resources of classes, spread over graphs.
 * @returns The resolver.
 */
function createResolver(): TermFitResolver {
	const store = new Store(new OwlReasoner());

	store.loadTurtle(`${PREAMBLE}
		v:Tree rdfs:subClassOf v:Plant .
		v:height rdfs:domain v:Plant .
		v:leafCount rdfs:domain v:Tree .
		v:salary rdfs:domain v:Person .
		v:note rdfs:label "note" .
		v:seeAlso rdfs:domain rdfs:Resource .
		v:age schema:domainIncludes v:Tree , v:Person .
		v:Oak a v:Tree .
		v:Alice a v:Person .
		v:Unknown rdfs:label "unknown" .
	`, 'http://example.org/vocabulary', true);
	store.loadTurtle(`${PREAMBLE}
		v:TreeShape a sh:NodeShape ;
			sh:targetClass v:Tree ;
			sh:property [ sh:path v:planted ] .
	`, 'http://example.org/shapes', true);

	return new TermFitResolver(store, new PropertyShapeIndex(store));
}

describe('TermFitResolver', () => {
	it('fits a predicate to a resource whose type, or a superclass of it, is its domain', () => {
		const resolver = createResolver();

		expect(resolver.predicateFit(`${V}leafCount`, [`${V}Tree`])).toBe('fits');
		expect(resolver.predicateFit(`${V}height`, [`${V}Tree`])).toBe('fits');
		expect(resolver.predicateFit(`${V}age`, [`${V}Tree`])).toBe('fits');
	});

	it('fits a predicate a shape of a type of the resource names', () => {
		expect(createResolver().predicateFit(`${V}planted`, [`${V}Tree`])).toBe('fits');
	});

	it('tells nothing of a predicate without a domain, or with one every resource is in', () => {
		const resolver = createResolver();

		expect(resolver.predicateFit(`${V}note`, [`${V}Tree`])).toBe('general');
		expect(resolver.predicateFit(`${V}seeAlso`, [`${V}Tree`])).toBe('general');
		expect(resolver.predicateFit(RDFS.label, [`${V}Tree`])).toBe('general');
	});

	it('tells a predicate whose domain is another class fits other resources', () => {
		const resolver = createResolver();

		expect(resolver.predicateFit(`${V}salary`, [`${V}Tree`])).toBe('other');
	});

	it('tells nothing of any predicate for a resource without a type', () => {
		expect(createResolver().predicateFit(`${V}leafCount`, [])).toBe('general');
	});

	it('fits a value that is an instance of a class of the range, or of a subclass, and tells nothing of one without a type', () => {
		const resolver = createResolver();

		expect(resolver.valueFit(`${V}Oak`, [`${V}Tree`])).toBe('fits');
		expect(resolver.valueFit(`${V}Oak`, [`${V}Plant`])).toBe('fits');
		expect(resolver.valueFit(`${V}Alice`, [`${V}Plant`])).toBe('other');
		expect(resolver.valueFit(`${V}Unknown`, [`${V}Plant`])).toBe('general');
		expect(resolver.valueFit(`${V}Oak`, [])).toBe('general');
	});
});

import { describe, it, expect } from 'vitest';
import { Quad, Quad_Object } from '@rdfjs/types';
import { LanguageTagUsageStats, Store } from '@faubulous/mentor-rdf';
import { addLanguageTagUsage, rdfDataFactory, replaceGraphQuads } from '@src/utilities/rdf';

describe('addLanguageTagUsage', () => {
	it('counts literals by their language tag and untagged literals under the empty tag', () => {
		const stats: LanguageTagUsageStats = {};

		addLanguageTagUsage(stats, rdfDataFactory.literal('Thing', 'en'));
		addLanguageTagUsage(stats, rdfDataFactory.literal('Ding', 'de'));
		addLanguageTagUsage(stats, rdfDataFactory.literal('Object', 'en'));
		addLanguageTagUsage(stats, rdfDataFactory.literal('42'));

		expect(stats).toEqual({ en: 2, de: 1, '': 1 });
	});

	it('ignores IRIs and blank nodes', () => {
		const stats: LanguageTagUsageStats = {};

		addLanguageTagUsage(stats, rdfDataFactory.namedNode('http://example.org/a'));
		addLanguageTagUsage(stats, rdfDataFactory.blankNode('b0'));

		expect(stats).toEqual({});
	});
});

describe('rdfDataFactory', () => {
	it('creates an xsd:string literal when the language or datatype is null', () => {
		const literal = rdfDataFactory.literal('Shape violation', null as any);

		expect(literal.language).toBe('');
		expect(literal.datatype.value).toBe('http://www.w3.org/2001/XMLSchema#string');
	});

	it('creates an empty dataset that accepts quads', () => {
		const dataset = rdfDataFactory.dataset();
		const quad = rdfDataFactory.quad(
			rdfDataFactory.namedNode('http://example.org/s'),
			rdfDataFactory.namedNode('http://example.org/p'),
			rdfDataFactory.literal('o')
		);

		expect(dataset.size).toBe(0);

		dataset.add(quad);

		expect(dataset.has(quad)).toBe(true);
	});
});

describe('replaceGraphQuads', () => {
	const graph = rdfDataFactory.namedNode('urn:graph');
	const subject = rdfDataFactory.namedNode('http://example.org/a');
	const predicate = rdfDataFactory.namedNode('http://example.org/p');

	/**
	 * Creates a quad of the graph with the given object.
	 */
	function makeQuad(object: Quad_Object): Quad {
		return rdfDataFactory.quad(subject, predicate, object, graph);
	}

	/**
	 * Returns the objects of the quads in the graph, sorted by their values.
	 */
	function getObjects(store: Store): string[] {
		return Array.from(store.matchQuads(null, null, null, graph)).map(q => `${q.object.termType}:${q.object.value}`).sort();
	}

	it('adds the quads to an empty graph', () => {
		const store = new Store();

		expect(replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.literal('1'))])).toBe(true);
		expect(getObjects(store)).toEqual(['Literal:1']);
	});

	it('does not change a graph that already contains exactly the quads', () => {
		const store = new Store();
		const quads = [makeQuad(rdfDataFactory.literal('1')), makeQuad(rdfDataFactory.blankNode('b0'))];

		replaceGraphQuads(store, graph, quads);

		const version = store.getGraphVersion(graph.value);

		expect(replaceGraphQuads(store, graph, quads)).toBe(false);
		expect(store.getGraphVersion(graph.value)).toBe(version);
	});

	it('deletes the quads that are no longer given and adds the new ones', () => {
		const store = new Store();

		replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.literal('1')), makeQuad(rdfDataFactory.literal('2'))]);

		expect(replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.literal('2')), makeQuad(rdfDataFactory.literal('3'))])).toBe(true);
		expect(getObjects(store)).toEqual(['Literal:2', 'Literal:3']);
	});

	it('distinguishes literals by their language and datatype', () => {
		const store = new Store();
		const xsdInteger = rdfDataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer');

		replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.literal('1'))]);

		expect(replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.literal('1', 'en'))])).toBe(true);
		expect(replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.literal('1', xsdInteger))])).toBe(true);
		expect(Array.from(store.matchQuads(null, null, null, graph)).map(q => (q.object as any).datatype.value)).toEqual([xsdInteger.value]);
	});

	it('distinguishes terms whose values only differ in how they would be concatenated', () => {
		const store = new Store();

		replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.namedNode('http://example.org/ab'))]);

		expect(replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.literal('http://example.org/ab'))])).toBe(true);
		expect(getObjects(store)).toEqual(['Literal:http://example.org/ab']);
	});

	it('keeps a triple that occurs more than once among the quads', () => {
		const store = new Store();
		const quad = makeQuad(rdfDataFactory.literal('1'));

		replaceGraphQuads(store, graph, [quad]);

		expect(replaceGraphQuads(store, graph, [quad, makeQuad(rdfDataFactory.literal('1'))])).toBe(false);
		expect(replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.literal('2')), makeQuad(rdfDataFactory.literal('2'))])).toBe(true);
		expect(getObjects(store)).toEqual(['Literal:2']);
	});

	it('leaves the other graphs untouched', () => {
		const store = new Store();
		const other = rdfDataFactory.quad(subject, predicate, rdfDataFactory.literal('x'), rdfDataFactory.namedNode('urn:other'));

		store.add(other);
		replaceGraphQuads(store, graph, [makeQuad(rdfDataFactory.literal('1'))]);
		replaceGraphQuads(store, graph, []);

		expect(store.has(other)).toBe(true);
		expect(getObjects(store)).toEqual([]);
	});
});

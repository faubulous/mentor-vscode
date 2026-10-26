import { describe, it, expect } from 'vitest';
import { LanguageTagUsageStats } from '@faubulous/mentor-rdf';
import { addLanguageTagUsage, rdfDataFactory } from '@src/utilities/rdf';

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

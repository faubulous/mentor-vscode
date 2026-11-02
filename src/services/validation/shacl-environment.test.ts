import { describe, expect, it } from 'vitest';
import { ShaclEnvironment } from './shacl-environment';

describe('ShaclEnvironment', () => {
	it('creates an xsd:string literal when the language or datatype is null', () => {
		const literal = ShaclEnvironment.literal('Shape violation', null as any);

		expect(literal.language).toBe('');
		expect(literal.datatype.value).toBe('http://www.w3.org/2001/XMLSchema#string');
	});

	it('creates an empty dataset that accepts quads', () => {
		const dataset = ShaclEnvironment.dataset();
		const quad = ShaclEnvironment.quad(
			ShaclEnvironment.namedNode('http://example.org/s'),
			ShaclEnvironment.namedNode('http://example.org/p'),
			ShaclEnvironment.literal('o')
		);

		expect(dataset.size).toBe(0);

		dataset.add(quad);

		expect(dataset.has(quad)).toBe(true);
	});
});

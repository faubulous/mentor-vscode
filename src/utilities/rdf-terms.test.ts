import { describe, expect, it } from 'vitest';
import { RdfDataFactory } from '@src/utilities/rdf';
import { copyTerm, reviveTerms } from '@src/utilities/rdf-terms';

/**
 * Copy a value as a message to or from a webview is copied: as plain data.
 */
function asMessage<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

describe('reviveTerms', () => {
	it('revives the terms of a message so they can be compared again', () => {
		const iri = RdfDataFactory.namedNode('http://example.org/s');
		const message = reviveTerms(asMessage({ id: 'Result', rows: [{ s: iri }] }));

		expect(message.id).toBe('Result');
		expect(message.rows[0].s.equals(iri)).toBe(true);
	});

	it('revives a literal with its datatype, language and direction', () => {
		const typed = RdfDataFactory.literal('1', RdfDataFactory.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
		const directional = RdfDataFactory.literal('مرحبا', { language: 'ar', direction: 'rtl' });
		const [revivedTyped, revivedDirectional] = reviveTerms(asMessage([typed, directional]));

		expect(revivedTyped.equals(typed)).toBe(true);
		expect(revivedDirectional.equals(directional)).toBe(true);
		expect(revivedDirectional.direction).toBe('rtl');
	});

	it('revives a quad term with its graph', () => {
		const quad = RdfDataFactory.quad(
			RdfDataFactory.blankNode('b'),
			RdfDataFactory.namedNode('http://example.org/p'),
			RdfDataFactory.literal('o'),
			RdfDataFactory.namedNode('http://example.org/g')
		);

		expect(reviveTerms(asMessage({ quad })).quad.equals(quad)).toBe(true);
	});

	it('leaves values that are no terms as they are', () => {
		expect(reviveTerms(asMessage({ termType: 'Other', values: [1, 'a', null] }))).toEqual({ termType: 'Other', values: [1, 'a', null] });
	});
});

describe('copyTerm', () => {
	it('keeps the base direction of a literal, also inside a quad', () => {
		const literal = RdfDataFactory.literal('مرحبا', { language: 'ar', direction: 'rtl' });
		const quad = RdfDataFactory.quad(RdfDataFactory.namedNode('http://example.org/s'), RdfDataFactory.namedNode('http://example.org/p'), literal);

		expect(copyTerm(literal).direction).toBe('rtl');
		expect(copyTerm(quad).equals(quad)).toBe(true);
	});
});

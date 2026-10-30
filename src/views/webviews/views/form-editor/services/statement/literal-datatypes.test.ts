import { describe, expect, it } from 'vitest';
import { XSD } from '@faubulous/mentor-rdf';
import { LiteralDatatypes, MARKDOWN_DATATYPE } from './literal-datatypes';

describe('LiteralDatatypes', () => {
	it('knows which datatypes are numbers', () => {
		expect(LiteralDatatypes.isNumeric(XSD.decimal)).toBe(true);
		expect(LiteralDatatypes.isNumeric(XSD.string)).toBe(false);
	});

	it('tells whether a text fits a datatype', () => {
		expect(LiteralDatatypes.fits(XSD.integer, '12')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.integer, '1.2')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.boolean, 'yes')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.double, '3.6E3')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.string, 'anything')).toBe(true);
		expect(LiteralDatatypes.fits('http://example.org/x', 'anything')).toBe(true);
	});

	it('tells whether a term fits its datatype', () => {
		expect(LiteralDatatypes.fitsTerm({ kind: 'literal', value: 'x', datatype: XSD.integer })).toBe(false);
		expect(LiteralDatatypes.fitsTerm({ kind: 'literal', value: 'x', language: 'en' })).toBe(true);
		expect(LiteralDatatypes.fitsTerm({ kind: 'iri', iri: 'http://x' })).toBe(true);
	});

	it('offers the datatypes a text fits, text first', () => {
		expect(LiteralDatatypes.fitting('12')).toEqual([XSD.string, XSD.integer, XSD.decimal, XSD.double, XSD.float, MARKDOWN_DATATYPE]);
		expect(LiteralDatatypes.fitting('true')).toEqual([XSD.string, XSD.boolean, MARKDOWN_DATATYPE]);
		expect(LiteralDatatypes.fitting('https://x')).toEqual([XSD.string, XSD.anyURI, MARKDOWN_DATATYPE]);
	});
});

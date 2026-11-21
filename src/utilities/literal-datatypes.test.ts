import { describe, expect, it } from 'vitest';
import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { LiteralDatatypes } from './literal-datatypes';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

describe('LiteralDatatypes', () => {
	it('knows which datatypes are numbers', () => {
		expect(LiteralDatatypes.isNumeric(XSD.decimal)).toBe(true);
		expect(LiteralDatatypes.isNumeric(XSD.string)).toBe(false);
	});

	it('tells whether a text fits a datatype by the lexical rules of XSD', () => {
		expect(LiteralDatatypes.fits(XSD.integer, '12')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.integer, '1.2')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.integer, '')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.boolean, 'yes')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.boolean, '0')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.double, '3.6E3')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.double, '-INF')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.gYear, '2019')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.string, 'anything')).toBe(true);
		expect(LiteralDatatypes.fits('http://example.org/x', 'anything')).toBe(true);
	});

	it('takes a date or a date and time only on a day its month has', () => {
		expect(LiteralDatatypes.fits(XSD.date, '2019-04-05')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.date, '2019-04-05Z')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.date, '2019-13-05')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.date, '2019-04-31')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.date, '2019-02-29')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.date, '2020-02-29')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.date, '1900-02-29')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.date, '2000-02-29')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.dateTime, '2019-04-05T10:30:00')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.dateTime, '2019-04-05T10:30')).toBe(false);
		expect(LiteralDatatypes.fits(XSD.dateTime, '2019-02-30T10:30:00Z')).toBe(false);
	});

	it('takes a URI without white space', () => {
		expect(LiteralDatatypes.fits(XSD.anyURI, 'https://example.org/a')).toBe(true);
		expect(LiteralDatatypes.fits(XSD.anyURI, 'https://example.org/a b')).toBe(false);
	});

	it('tells whether a term fits its datatype', () => {
		expect(LiteralDatatypes.fitsTerm(RdfDataFactory.literal('x', RdfDataFactory.namedNode(XSD.integer)))).toBe(false);
		expect(LiteralDatatypes.fitsTerm(RdfDataFactory.literal('x', 'en'))).toBe(true);
		expect(LiteralDatatypes.fitsTerm(RdfDataFactory.namedNode('http://x'))).toBe(true);
	});

	it.each([
		['2024-02-29T10:30:00', XSD.dateTime],
		['2024-02-29', XSD.date],
		['2024-02-29+01:00', XSD.date],
		['-42', XSD.integer],
		['3.14', XSD.decimal],
		['.5', XSD.decimal],
		['true', XSD.boolean],
		['https://example.org/a', XSD.anyURI]
	])('suggests the datatype a plain string %s looks like a value of', (text, datatype) => {
		expect(LiteralDatatypes.suggest(text)).toBe(datatype);
	});

	it.each(['', 'tree', '2023-02-29', '2024-02-29T10:30', '1.5E3', 'True', 'https://a b', 'ftp://example.org'])('suggests no datatype for %j', text => {
		expect(LiteralDatatypes.suggest(text)).toBeUndefined();
	});
});

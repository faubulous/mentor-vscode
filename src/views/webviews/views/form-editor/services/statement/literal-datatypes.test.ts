import { describe, expect, it } from 'vitest';
import { XSD } from '@faubulous/mentor-rdf';
import { LiteralDatatypes } from './literal-datatypes';

describe('LiteralDatatypes', () => {
	it('knows the datatypes by IRI and which of them are numbers', () => {
		expect(LiteralDatatypes.of(XSD.integer)?.label).toBe('Integer');
		expect(LiteralDatatypes.of('http://example.org/x')).toBeUndefined();
		expect(LiteralDatatypes.isNumeric(XSD.decimal)).toBe(true);
		expect(LiteralDatatypes.isNumeric(XSD.string)).toBe(false);
	});

	it('tells what keeps a text from fitting a datatype', () => {
		expect(LiteralDatatypes.problemOf(XSD.integer, '12')).toBeUndefined();
		expect(LiteralDatatypes.problemOf(XSD.integer, '1.2')).toMatch(/Whole numbers/);
		expect(LiteralDatatypes.problemOf(XSD.boolean, 'yes')).toBe('true or false');
		expect(LiteralDatatypes.problemOf(XSD.double, '3.6E3')).toBeUndefined();
		expect(LiteralDatatypes.problemOf(XSD.string, 'anything')).toBeUndefined();
		expect(LiteralDatatypes.problemOf('http://example.org/x', 'anything')).toBeUndefined();
	});

	it('tells what keeps a literal term from fitting its datatype', () => {
		expect(LiteralDatatypes.problemOfTerm({ kind: 'literal', value: 'x', datatype: XSD.integer })).toMatch(/Whole numbers/);
		expect(LiteralDatatypes.problemOfTerm({ kind: 'literal', value: 'x', language: 'en' })).toBeUndefined();
		expect(LiteralDatatypes.problemOfTerm({ kind: 'iri', iri: 'http://x' })).toBeUndefined();
	});

	it('offers the datatypes a text fits, text first', () => {
		expect(LiteralDatatypes.fitting('12').map(datatype => datatype.label)).toEqual(['Text', 'Integer', 'Decimal', 'Double', 'Float', 'Markdown']);
		expect(LiteralDatatypes.fitting('true').map(datatype => datatype.label)).toEqual(['Text', 'Boolean', 'Markdown']);
		expect(LiteralDatatypes.fitting('https://x').map(datatype => datatype.label)).toEqual(['Text', 'URI', 'Markdown']);
	});
});

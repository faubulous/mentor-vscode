import { describe, expect, it } from 'vitest';
import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getDatatypeName, getDatatypeProblem, getLiteralTag, getLiteralTagData, getPrefixedNameIn } from './datatype-labels';

const GEO = 'http://www.opengis.net/ont/geosparql#';

const prefixedNameOf = getPrefixedNameIn([{ prefix: 'xsd', iri: 'http://www.w3.org/2001/XMLSchema#' }, { prefix: 'geo', iri: GEO }]);

describe('datatype labels', () => {
	it('names XSD datatypes by their local name, others by their prefixed name or local name', () => {
		expect(getDatatypeName(RdfDataFactory.namedNode(XSD.date), prefixedNameOf)).toBe('date');
		expect(getDatatypeName(RdfDataFactory.namedNode(`${GEO}wktLiteral`), prefixedNameOf)).toBe('geo:wktLiteral');
		expect(getDatatypeName(RdfDataFactory.namedNode('http://example.org/units#celsius'), prefixedNameOf)).toBe('celsius');
	});

	it('says what a text of a datatype should be, where the datatype has a format', () => {
		expect(getDatatypeProblem('date', XSD.date)).toBe('Not a valid date — expected YYYY-MM-DD');
		expect(getDatatypeProblem('duration', XSD.duration)).toBe('Not a valid duration');
	});

	it('tags a literal by its language in standard form or by its datatype, and a plain string not at all', () => {
		expect(getLiteralTag(RdfDataFactory.literal('Baum', 'de-de'), prefixedNameOf)).toBe('de-DE');
		expect(getLiteralTag(RdfDataFactory.literal('42', RdfDataFactory.namedNode(XSD.integer)), prefixedNameOf)).toBe('integer');
		expect(getLiteralTag(RdfDataFactory.literal('Tree'), prefixedNameOf)).toBeUndefined();
	});

	it('gives the tag of a field the IRI of its datatype or the name of its language as tooltip, and an accessible name that changes it', () => {
		expect(getLiteralTagData(RdfDataFactory.literal('2019-04-05', RdfDataFactory.namedNode(XSD.date)), prefixedNameOf)).toEqual({ text: 'date', tooltip: XSD.date, accessibleName: 'Datatype date, change' });
		expect(getLiteralTagData(RdfDataFactory.literal('Baum', 'de-de'), prefixedNameOf)).toEqual({ text: 'de-DE', tooltip: `Language: ${new Intl.DisplayNames(undefined, { type: 'language' }).of('de-DE')}`, accessibleName: 'Language de-DE, change' });
	});
});

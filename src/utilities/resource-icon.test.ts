import { describe, expect, it } from 'vitest';
import { OWL, RDF, RDFS, SH, SKOS, XSD } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import * as fs from 'fs';
import * as path from 'path';
import { getIconContextOf, getPropertyIconName, getResourceIconName } from './resource-icon';

/**
 * The glyph names the Mentor icon font carries, read from the glyph sources the font is built
 * from (`media/glyphs/u<codepoint>-<name>.svg`), so the test needs no build output.
 */
function readMentorIconNames(): Set<string> {
	const glyphs = path.resolve(__dirname, '../../media/glyphs');
	const names = fs.readdirSync(glyphs)
		.map(file => /^u[0-9a-f]{4}-(.+)\.svg$/i.exec(file)?.[1])
		.filter((name): name is string => name !== undefined);

	return new Set(names);
}

describe('getResourceIconName', () => {
	it('names a glyph for every kind of resource Mentor shows', () => {
		const types = [
			OWL.Ontology, OWL.Class, OWL.NamedIndividual, SKOS.Concept,
			SKOS.ConceptScheme, SH.NodeShape, SH.PropertyShape,
			OWL.ObjectProperty, OWL.DatatypeProperty, OWL.AnnotationProperty, RDF.Property
		];

		for (const type of types) {
			expect(getResourceIconName([type]), type).toBeDefined();
		}
	});

	it('only names custom glyphs the icon font actually carries', () => {
		// A name the font does not carry renders as nothing at all, which is how the data property
		// glyph went missing: `rdf-property` was never one of the contributed icons.
		const available = readMentorIconNames();

		const names = new Set<string | undefined>([
			...[
				OWL.Ontology, OWL.Class, OWL.NamedIndividual, SKOS.Concept,
				SKOS.ConceptScheme, SH.NodeShape, SH.PropertyShape, RDF.List,
				OWL.ObjectProperty, OWL.DatatypeProperty, OWL.AnnotationProperty, RDF.Property
			].map(type => getResourceIconName([type])),
			...[
				undefined, XSD.string, XSD.integer, XSD.date, XSD.dateTime,
				XSD.boolean, XSD.base64Binary, RDF.langString
			].map(range => getPropertyIconName(range))
		]);

		for (const name of names) {
			if (name?.startsWith('rdf-')) {
				expect(available.has(name), `${name} must exist in the Mentor icon font`).toBe(true);
			}
		}
	});

	it('shows a datatype property by the text glyph where its range tells nothing more specific', () => {
		expect(getResourceIconName([OWL.DatatypeProperty])).toBe('symbol-text');
		expect(getResourceIconName([OWL.DatatypeProperty], { rangeIri: 'http://example.org/Length' })).toBe('symbol-text');
		expect(getResourceIconName([OWL.DatatypeProperty], { rangeIri: XSD.dateTime })).toBe('calendar');
		expect(getResourceIconName([OWL.ObjectProperty])).toBe('rdf-object-property');
		expect(getResourceIconName([RDF.Property])).toBe('rdf-object-property');
	});

	it('shows a datatype by the shape of the values it holds, and text where it has no glyph of its own', () => {
		expect(getResourceIconName([RDFS.Datatype], { iri: XSD.dateTime })).toBe('calendar');
		expect(getResourceIconName([RDFS.Datatype], { iri: XSD.integer })).toBe('symbol-number');
		expect(getResourceIconName([RDFS.Datatype], { iri: 'http://example.org/Length' })).toBe('symbol-text');
		expect(getResourceIconName([RDFS.Datatype])).toBe('symbol-text');
	});

	it('has no glyph for a resource it does not recognize', () => {
		expect(getResourceIconName([])).toBeUndefined();
		expect(getResourceIconName(['http://example.org/Thing'])).toBeUndefined();
	});
});

describe('getPropertyIconName', () => {
	it('shows the kind of value a property takes', () => {
		expect(getPropertyIconName(XSD.string)).toBe('symbol-text');
		expect(getPropertyIconName(XSD.integer)).toBe('symbol-number');
		expect(getPropertyIconName(XSD.dateTime)).toBe('calendar');
		expect(getPropertyIconName(XSD.boolean)).toBe('symbol-boolean');
		expect(getPropertyIconName(XSD.base64Binary)).toBe('file-binary');
		expect(getPropertyIconName(XSD.date)).toBe('calendar');
		expect(getPropertyIconName(XSD.decimal)).toBe('symbol-number');
		expect(getPropertyIconName(RDF.langString)).toBe('symbol-text');
	});

	it('falls back to the object property glyph for an undeclared or unknown range', () => {
		expect(getPropertyIconName()).toBe('rdf-object-property');
		expect(getPropertyIconName('http://example.org/Thing')).toBe('rdf-object-property');
	});
});

describe('getIconContextOf', () => {
	it('reads the IRI, the range, the constrained datatype and the predicates from the statements about a resource', () => {
		const subject = RdfDataFactory.namedNode('http://example.org/created');
		const statement = (predicate: string, object: string) => RdfDataFactory.quad(subject, RdfDataFactory.namedNode(predicate), RdfDataFactory.namedNode(object));

		expect(getIconContextOf([
			statement(RDF.type, OWL.DatatypeProperty),
			statement(RDFS.range, XSD.dateTime),
			statement(SH.datatype, XSD.date),
			RdfDataFactory.quad(subject, RdfDataFactory.namedNode(RDFS.label), RdfDataFactory.literal('created'))
		])).toEqual({ iri: subject.value, predicateIris: [RDF.type, RDFS.range, SH.datatype, RDFS.label], rangeIri: XSD.dateTime, datatypeIri: XSD.date });
	});
});

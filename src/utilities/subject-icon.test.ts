import { describe, expect, it } from 'vitest';
import { OWL, RDF, RDFS, SH, SKOS, XSD } from '@faubulous/mentor-rdf';
import { getSubjectIconName } from './subject-icon';

describe('getSubjectIconName', () => {
	it('picks the glyph of the asserted type', () => {
		expect(getSubjectIconName([OWL.Class])).toBe('mentor-rdf-class');
		expect(getSubjectIconName([SKOS.Concept])).toBe('mentor-rdf-concept');
		expect(getSubjectIconName([SH.NodeShape])).toBe('mentor-rdf-shape');
		expect(getSubjectIconName([OWL.NamedIndividual])).toBe('mentor-rdf-individual');
	});

	it('shows a data property by the kind of value it takes, as the definition tree does', () => {
		expect(getSubjectIconName([OWL.DatatypeProperty], { rangeIri: XSD.string })).toBe('symbol-text');
		expect(getSubjectIconName([OWL.DatatypeProperty], { rangeIri: XSD.integer })).toBe('symbol-number');
		expect(getSubjectIconName([OWL.DatatypeProperty], { rangeIri: XSD.date })).toBe('calendar');
		expect(getSubjectIconName([OWL.DatatypeProperty], { rangeIri: XSD.boolean })).toBe('symbol-boolean');
		expect(getSubjectIconName([RDF.Property], { rangeIri: RDF.langString })).toBe('symbol-text');
	});

	it('falls back to the property glyph when no range is declared', () => {
		for (const type of [OWL.ObjectProperty, OWL.DatatypeProperty, OWL.AnnotationProperty, RDF.Property]) {
			expect(getSubjectIconName([type]), type).toBe('mentor-rdf-object-property');
		}
	});

	it('only ever returns a glyph that exists', () => {
		// A name the icon font does not carry renders as nothing at all, which is how the data
		// property glyph went missing.
		const cases: [string[], string | undefined][] = [
			[[OWL.Class], undefined],
			[[RDFS.Class], undefined],
			[[OWL.Ontology], undefined],
			[[OWL.DatatypeProperty], XSD.string],
			[[OWL.DatatypeProperty], undefined],
			[[SH.PropertyShape], undefined],
			[['http://example.org/Unknown'], undefined]
		];

		for (const [types, rangeIri] of cases) {
			expect(getSubjectIconName(types, { rangeIri })).not.toBe('mentor-rdf-property');
		}
	});

	it('prefers the more specific type when a resource asserts several', () => {
		expect(getSubjectIconName([OWL.Class, OWL.Ontology])).toBe('mentor-rdf-ontology');
	});

	it('marks a shape that declares no type of its own', () => {
		// Shapes are written inline far more often than they are typed: a property shape is
		// usually just `[ sh:path … ]`, with nothing saying what it is.
		const path = SH.path;

		expect(getSubjectIconName([], { predicateIris: [path, SH.minCount] }))
			.toBe('mentor-rdf-shape-property');

		expect(getSubjectIconName([], { predicateIris: [path], datatypeIri: XSD.string }))
			.toBe('symbol-text');

		expect(getSubjectIconName([], { predicateIris: [SH.nodeKind] })).toBe('mentor-rdf-shape');
		expect(getSubjectIconName([], { predicateIris: [SH.property] })).toBe('mentor-rdf-shape');
	});

	it('marks the head of a collection', () => {
		expect(getSubjectIconName([], { predicateIris: [RDF.first, RDF.rest] }))
			.toBe('mentor-rdf-list');
	});

	it('falls back to the glyph of an individual for an untyped or unknown resource', () => {
		expect(getSubjectIconName([])).toBe('mentor-rdf-individual');
		expect(getSubjectIconName(['http://example.org/Thing'])).toBe('mentor-rdf-individual');
		expect(getSubjectIconName([], { predicateIris: ['http://example.org/p'] })).toBe('mentor-rdf-individual');
	});
});

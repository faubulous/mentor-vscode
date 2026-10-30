import { describe, expect, it } from 'vitest';
import { OWL, RDF, SH, SKOS, XSD } from '@faubulous/mentor-rdf';
import * as fs from 'fs';
import * as path from 'path';
import { getPropertyIconName, getResourceIconName } from './resource-icon';

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

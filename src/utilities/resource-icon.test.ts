import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getDatatypeIconName, getPropertyIconName, getResourceIconName } from './resource-icon';

const OWL = 'http://www.w3.org/2002/07/owl#';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const SH = 'http://www.w3.org/ns/shacl#';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

/**
 * The glyph names the bundled Mentor icon font carries.
 */
function readMentorIconNames(): Set<string> {
	const file = path.resolve(__dirname, '../../media/mentor-icons.json');

	return new Set(Object.keys(JSON.parse(fs.readFileSync(file, 'utf8'))));
}

describe('getResourceIconName', () => {
	it('names a glyph for every kind of resource Mentor shows', () => {
		const types = [
			`${OWL}Ontology`, `${OWL}Class`, `${OWL}NamedIndividual`, `${SKOS}Concept`,
			`${SKOS}ConceptScheme`, `${SH}NodeShape`, `${SH}PropertyShape`,
			`${OWL}ObjectProperty`, `${OWL}DatatypeProperty`, `${OWL}AnnotationProperty`, `${RDF}Property`
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
				`${OWL}Ontology`, `${OWL}Class`, `${OWL}NamedIndividual`, `${SKOS}Concept`,
				`${SKOS}ConceptScheme`, `${SH}NodeShape`, `${SH}PropertyShape`, `${RDF}List`,
				`${OWL}ObjectProperty`, `${OWL}DatatypeProperty`, `${OWL}AnnotationProperty`, `${RDF}Property`
			].map(type => getResourceIconName([type])),
			...[
				undefined, `${XSD}string`, `${XSD}integer`, `${XSD}date`, `${XSD}dateTime`,
				`${XSD}boolean`, `${XSD}base64Binary`, `${RDF}langString`
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
		expect(getPropertyIconName(`${XSD}string`)).toBe('symbol-text');
		expect(getPropertyIconName(`${XSD}integer`)).toBe('symbol-number');
		expect(getPropertyIconName(`${XSD}dateTime`)).toBe('calendar');
		expect(getPropertyIconName(`${XSD}boolean`)).toBe('symbol-boolean');
		expect(getPropertyIconName(`${XSD}base64Binary`)).toBe('file-binary');
	});

	it('falls back to the object property glyph for an undeclared or unknown range', () => {
		expect(getPropertyIconName()).toBe('rdf-object-property');
		expect(getPropertyIconName('http://example.org/Thing')).toBe('rdf-object-property');
	});
});

describe('getDatatypeIconName', () => {
	it('names the shape of the values a datatype holds', () => {
		expect(getDatatypeIconName(`${XSD}date`)).toBe('calendar');
		expect(getDatatypeIconName(`${XSD}dateTime`)).toBe('calendar');
		expect(getDatatypeIconName(`${XSD}boolean`)).toBe('symbol-boolean');
		expect(getDatatypeIconName(`${XSD}base64Binary`)).toBe('file-binary');
		expect(getDatatypeIconName(`${XSD}integer`)).toBe('symbol-number');
		expect(getDatatypeIconName(`${XSD}decimal`)).toBe('symbol-number');
	});

	it('treats a literal without a datatype as the text it is', () => {
		expect(getDatatypeIconName()).toBe('symbol-text');
		expect(getDatatypeIconName(`${XSD}string`)).toBe('symbol-text');
		expect(getDatatypeIconName(`${RDF}langString`)).toBe('symbol-text');
	});

	it('names no glyph for a datatype it does not know', () => {
		expect(getDatatypeIconName('http://example.org/types/thing')).toBeUndefined();
	});

	it('leaves a property with no range a relation, and one known to take literals text', () => {
		expect(getPropertyIconName()).toBe('rdf-object-property');
		expect(getPropertyIconName(undefined, 'literal')).toBe('symbol-text');
		expect(getPropertyIconName('http://example.org/types/thing', 'literal')).toBe('symbol-text');
		expect(getPropertyIconName('http://example.org/Person')).toBe('rdf-object-property');
	});
});

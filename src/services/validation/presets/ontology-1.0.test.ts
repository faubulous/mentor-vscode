import { describe, expect, it } from 'vitest';
import { Validator } from 'shacl-engine';
import { Store } from '@faubulous/mentor-rdf';
import { rdfDataFactory } from '@src/utilities/rdf';
import { BASIC_ONTOLOGY_SHAPES_URI } from '../preset-definitions';
import { loadPresetShapeGraphs } from './index';

const DATA_GRAPH_URI = 'urn:test:data';

/**
 * Validates a Turtle document against one of the bundled preset shape graphs
 * using the real shacl-engine, exactly like the validation service does.
 */
/**
 * The concatenated message text of a validation result. Shapes wrap each
 * requirement in an `sh:or` (to skip anonymous nodes), so the constraint
 * component is always `sh:OrConstraintComponent` and the specific requirement
 * is conveyed by the shape's `sh:message`.
 */
function messageOf(result: any): string {
	return (result.message ?? []).map((m: any) => m.value).join(' ');
}

async function validate(shapesUri: string, dataTurtle: string) {
	const store = new Store();

	loadPresetShapeGraphs(store);
	store.loadTurtle(dataTurtle, DATA_GRAPH_URI, false);

	const validator = new Validator(store.getDataset([shapesUri], false), { factory: rdfDataFactory });

	return validator.validate({ dataset: store.getDataset([DATA_GRAPH_URI], false) });
}

const ONTOLOGY_PREFIXES = `
	@prefix dc: <http://purl.org/dc/elements/1.1/> .
	@prefix dct: <http://purl.org/dc/terms/> .
	@prefix ex: <http://example.org/> .
	@prefix owl: <http://www.w3.org/2002/07/owl#> .
	@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
	@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
`;

const CONFORMING_HEADER = `
	ex: a owl:Ontology ;
		dct:title "Example Ontology"@en ;
		dct:description "An example ontology used for testing."@en .
`;

describe('Basic Ontology preset shapes', () => {
	it('accepts a fully documented ontology', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}
			${CONFORMING_HEADER}

			ex:Thing a owl:Class ;
				rdfs:label "Thing"@en ;
				rdfs:comment "A thing."@en ;
				rdfs:isDefinedBy ex: .

			ex:hasPart a owl:ObjectProperty ;
				rdfs:label "has part"@en ;
				rdfs:comment "Relates a thing to one of its parts."@en ;
				rdfs:isDefinedBy ex: .

			ex:theThing a owl:NamedIndividual ;
				rdfs:label "The thing"@en ;
				rdfs:comment "The one and only thing."@en ;
				rdfs:isDefinedBy ex: .
		`);

		expect(report.conforms).toBe(true);
	});

	it('accepts skos:prefLabel and skos:definition in place of rdfs:label and rdfs:comment', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}
			${CONFORMING_HEADER}

			ex:Thing a owl:Class ;
				skos:prefLabel "Thing"@en ;
				skos:definition "A thing."@en ;
				rdfs:isDefinedBy ex: .
		`);

		expect(report.conforms).toBe(true);
	});

	it('accepts a dc: (Dublin Core Elements) ontology header', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}

			ex: a owl:Ontology ;
				dc:title "Example Ontology"@en ;
				dc:description "An example ontology used for testing."@en .
		`);

		expect(report.conforms).toBe(true);
	});

	it('does not flag anonymous class expressions (owl:Restriction / owl:unionOf blank nodes)', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}
			${CONFORMING_HEADER}

			ex:Process a owl:Class ;
				rdfs:label "process"@en ;
				rdfs:comment "a process"@en ;
				rdfs:isDefinedBy ex: ;
				rdfs:subClassOf
					[ a owl:Restriction ; owl:onProperty ex:hasPart ; owl:allValuesFrom ex:Process ] ,
					[ a owl:Class ; owl:unionOf ( ex:A ex:B ) ] .
		`);

		expect(report.conforms).toBe(true);
	});

	it('reports a class without a label', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}
			${CONFORMING_HEADER}

			ex:Thing a owl:Class ;
				rdfs:comment "A thing."@en ;
				rdfs:isDefinedBy ex: .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
		expect(report.results[0].severity.value).toBe('http://www.w3.org/ns/shacl#Violation');
	});

	it('reports a property without a comment', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}
			${CONFORMING_HEADER}

			ex:hasPart a owl:ObjectProperty ;
				rdfs:label "has part"@en ;
				rdfs:isDefinedBy ex: .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
	});

	it('reports a term without an rdfs:isDefinedBy reference', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}
			${CONFORMING_HEADER}

			ex:Thing a owl:Class ;
				rdfs:label "Thing"@en ;
				rdfs:comment "A thing."@en .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
		expect(messageOf(report.results[0])).toContain('rdfs:isDefinedBy');
	});

	it('accepts an rdfs:isDefinedBy reference to any IRI', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}
			${CONFORMING_HEADER}

			ex:Thing a owl:Class ;
				rdfs:label "Thing"@en ;
				rdfs:comment "A thing."@en ;
				rdfs:isDefinedBy ex:somethingElse .
		`);

		expect(report.conforms).toBe(true);
	});

	it('reports an rdfs:isDefinedBy reference that is not an IRI', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}
			${CONFORMING_HEADER}

			ex:Thing a owl:Class ;
				rdfs:label "Thing"@en ;
				rdfs:comment "A thing."@en ;
				rdfs:isDefinedBy "not an iri" .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
		expect(messageOf(report.results[0])).toContain('rdfs:isDefinedBy');
	});

	it('reports an ontology header without a title', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}

			ex: a owl:Ontology ;
				dct:description "An example ontology used for testing."@en .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
	});

	it('reports an ontology header with a comment but no dct:description', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}

			ex: a owl:Ontology ;
				dct:title "Example Ontology"@en ;
				rdfs:comment "An example ontology used for testing."@en .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
	});
});

import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DataFactory as N3DataFactory } from 'n3';
import { DatasetCore } from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';
import { Validator } from 'shacl-engine';
import { Store } from '@faubulous/mentor-rdf';
import { getShapeGraphCandidates } from '@src/utilities/shacl';
import {
	BASIC_ONTOLOGY_SHAPES_URI,
	BASIC_TAXONOMY_SHAPES_URI,
	loadPresetShapeGraphs,
} from './index';

// The same combined RDF/JS factory the validation service passes to shacl-engine.
const rdfFactory = {
	...N3DataFactory,
	literal(value: string, languageOrDataType?: any) {
		return N3DataFactory.literal(value, languageOrDataType ?? undefined);
	},
	dataset(): DatasetCore {
		return RdfStore.createDefault().asDataset();
	}
};

const DATA_GRAPH_URI = 'urn:test:data';

/**
 * Validates a Turtle document against one of the bundled preset shape graphs
 * using the real shacl-engine, exactly like the validation service does.
 */
async function validate(shapesUri: string, dataTurtle: string) {
	const store = new Store();

	loadPresetShapeGraphs(store);
	store.loadTurtle(dataTurtle, DATA_GRAPH_URI, false);

	const validator = new Validator(store.getDataset([shapesUri], false), { factory: rdfFactory });

	return validator.validate({ dataset: store.getDataset([DATA_GRAPH_URI], false) });
}

const ONTOLOGY_PREFIXES = `
	@prefix dct: <http://purl.org/dc/terms/> .
	@prefix ex: <http://example.org/> .
	@prefix owl: <http://www.w3.org/2002/07/owl#> .
	@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
`;

const TAXONOMY_PREFIXES = `
	@prefix ex: <http://example.org/> .
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
		expect(report.results[0].constraintComponent.value).toBe('http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent');
	});

	it('reports an rdfs:isDefinedBy reference to a resource not typed owl:Ontology', async () => {
		const report = await validate(BASIC_ONTOLOGY_SHAPES_URI, `
			${ONTOLOGY_PREFIXES}
			${CONFORMING_HEADER}

			ex:Thing a owl:Class ;
				rdfs:label "Thing"@en ;
				rdfs:comment "A thing."@en ;
				rdfs:isDefinedBy ex:somethingElse .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
		expect(report.results[0].constraintComponent.value).toBe('http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent');
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

describe('Basic Taxonomy preset shapes', () => {
	it('accepts a fully documented taxonomy', async () => {
		const report = await validate(BASIC_TAXONOMY_SHAPES_URI, `
			${TAXONOMY_PREFIXES}

			ex:scheme a skos:ConceptScheme ;
				skos:prefLabel "Example Scheme"@en ;
				skos:definition "An example concept scheme."@en .

			ex:top a skos:Concept ;
				skos:prefLabel "Top"@en ;
				skos:definition "The top concept."@en ;
				skos:topConceptOf ex:scheme .

			ex:leaf a skos:Concept ;
				skos:prefLabel "Leaf"@en ;
				skos:definition "A leaf concept."@en ;
				skos:inScheme ex:scheme .
		`);

		expect(report.conforms).toBe(true);
	});

	it('reports a concept without a preferred label', async () => {
		const report = await validate(BASIC_TAXONOMY_SHAPES_URI, `
			${TAXONOMY_PREFIXES}

			ex:leaf a skos:Concept ;
				skos:definition "A leaf concept."@en ;
				skos:inScheme ex:scheme .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
	});

	it('reports a concept without a definition', async () => {
		const report = await validate(BASIC_TAXONOMY_SHAPES_URI, `
			${TAXONOMY_PREFIXES}

			ex:leaf a skos:Concept ;
				skos:prefLabel "Leaf"@en ;
				skos:inScheme ex:scheme .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
	});

	it('reports a concept that is not part of a concept scheme', async () => {
		const report = await validate(BASIC_TAXONOMY_SHAPES_URI, `
			${TAXONOMY_PREFIXES}

			ex:leaf a skos:Concept ;
				skos:prefLabel "Leaf"@en ;
				skos:definition "A leaf concept."@en .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
	});

	it('reports duplicate preferred labels in the same language', async () => {
		const report = await validate(BASIC_TAXONOMY_SHAPES_URI, `
			${TAXONOMY_PREFIXES}

			ex:leaf a skos:Concept ;
				skos:prefLabel "Leaf"@en , "Foliage"@en ;
				skos:definition "A leaf concept."@en ;
				skos:inScheme ex:scheme .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
		expect(report.results[0].constraintComponent.value).toBe('http://www.w3.org/ns/shacl#UniqueLangConstraintComponent');
	});

	it('reports a concept scheme without a definition', async () => {
		const report = await validate(BASIC_TAXONOMY_SHAPES_URI, `
			${TAXONOMY_PREFIXES}

			ex:scheme a skos:ConceptScheme ;
				skos:prefLabel "Example Scheme"@en .
		`);

		expect(report.conforms).toBe(false);
		expect(report.results).toHaveLength(1);
	});
});

describe('loadPresetShapeGraphs', () => {
	it('registers both shape graphs in the store', () => {
		const store = new Store();

		loadPresetShapeGraphs(store);

		expect(store.hasGraph(BASIC_ONTOLOGY_SHAPES_URI)).toBe(true);
		expect(store.hasGraph(BASIC_TAXONOMY_SHAPES_URI)).toBe(true);
		expect(getShapeGraphCandidates(store)).toEqual(
			expect.arrayContaining([BASIC_ONTOLOGY_SHAPES_URI, BASIC_TAXONOMY_SHAPES_URI])
		);
	});

	it('matches the preset profiles shipped as the manifest default', () => {
		const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf8'));
		const settings = manifest.contributes.configuration
			.flatMap((section: any) => Object.entries(section.properties ?? {}))
			.find(([key]: [string, any]) => key === 'mentor.shacl.validation');

		expect(settings).toBeDefined();

		const profiles = settings![1].default?.profiles;

		expect(Object.keys(profiles)).toEqual(['basic-ontology', 'basic-taxonomy']);
		expect(profiles['basic-ontology'].shapes).toEqual([BASIC_ONTOLOGY_SHAPES_URI]);
		expect(profiles['basic-taxonomy'].shapes).toEqual([BASIC_TAXONOMY_SHAPES_URI]);

		// Presets ship dormant: without paths they match no documents until customized.
		expect(profiles['basic-ontology'].paths).toBeUndefined();
		expect(profiles['basic-taxonomy'].paths).toBeUndefined();
	});
});

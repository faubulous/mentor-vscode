import { describe, expect, it } from 'vitest';
import { DataFactory as N3DataFactory } from 'n3';
import { DatasetCore } from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';
import { Validator } from 'shacl-engine';
import { Store } from '@faubulous/mentor-rdf';
import {
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

	const validator = new Validator(store.getDataset([shapesUri], false), { factory: rdfFactory });

	return validator.validate({ dataset: store.getDataset([DATA_GRAPH_URI], false) });
}

const TAXONOMY_PREFIXES = `
	@prefix ex: <http://example.org/> .
	@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
`;

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
		expect(messageOf(report.results[0])).toContain('per language');
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

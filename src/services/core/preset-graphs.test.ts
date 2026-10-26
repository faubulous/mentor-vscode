import { describe, it, expect } from 'vitest';
import { Store, _RDFS, _SPARQL } from '@faubulous/mentor-rdf';
import { FRAMEWORK_VOCABULARY_GRAPHS, PRESET_GRAPHS, loadFrameworkVocabularies } from '@src/services/core/preset-graphs';
import { PRESET_SHAPE_GRAPHS } from '@src/services/validation/presets';

describe('preset graphs', () => {
	it('contains the framework vocabularies and the preset shape graphs', () => {
		expect(PRESET_GRAPHS).toEqual([...FRAMEWORK_VOCABULARY_GRAPHS, ...PRESET_SHAPE_GRAPHS]);
	});

	it('has a unique document path for every graph', () => {
		const paths = PRESET_GRAPHS.map(graph => graph.path);

		expect(new Set(paths).size).toBe(paths.length);
	});

	it('has a Turtle source for every graph', () => {
		for (const graph of PRESET_GRAPHS) {
			expect(graph.source.length, graph.path).toBeGreaterThan(0);
		}
	});

	it('names the graph of a framework vocabulary by its namespace', () => {
		expect(FRAMEWORK_VOCABULARY_GRAPHS.find(graph => graph.path === 'vocabularies/rdfs.ttl')?.graphIri).toBe(_RDFS);
		expect(FRAMEWORK_VOCABULARY_GRAPHS.find(graph => graph.path === 'vocabularies/sparql.ttl')?.graphIri).toBe(_SPARQL);
	});

	it('loads every framework vocabulary into its graph', () => {
		const store = new Store();

		loadFrameworkVocabularies(store);

		expect(store.getGraphs().sort()).toEqual(FRAMEWORK_VOCABULARY_GRAPHS.map(graph => graph.graphIri).sort());
	});
});

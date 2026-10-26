import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { RDF, RDFS, Store } from '@faubulous/mentor-rdf';
import { PresetGraphDocument } from '@src/languages/turtle/preset-graph-document';
import { MentorVfsUri } from '@src/providers/mentor-vfs-uri';
import { ResourceDefinitionProvider } from '@src/providers/resource-definition-provider';
import { PRESET_GRAPHS } from '@src/services/core/preset-graphs';
import { createTestSettings, createTestStore, createTestVocabulary, createTurtleDocument } from '@src/utilities/mocks/factories';

/**
 * Creates the document of a preset graph and loads its source.
 * @param path The path of the preset graph.
 * @returns The document and the store it was created with.
 */
async function loadPresetDocument(path: string) {
	const graph = PRESET_GRAPHS.find(g => g.path === path)!;
	const store = createTestStore();
	const document = new PresetGraphDocument(MentorVfsUri.toUri(graph), graph, store, createTestVocabulary(store), createTestSettings());

	document.parse(graph.source);

	await document.loadTriples(graph.source);
	await document.infer();

	return { graph, store, document };
}

describe('PresetGraphDocument', () => {
	it('is a preset document', async () => {
		const { document } = await loadPresetDocument('vocabularies/rdfs.ttl');

		expect(document.isPreset).toBe(true);
	});

	it('points to the preset graph without adding its triples to the store', async () => {
		const { graph, store, document } = await loadPresetDocument('vocabularies/rdfs.ttl');

		expect(document.graphs).toEqual([graph.graphIri]);
		expect(document.isLoaded).toBe(true);
		expect(store.size).toBe(0);
	});

	it('provides the source ranges of the defined resources', async () => {
		const { document } = await loadPresetDocument('vocabularies/rdfs.ttl');

		expect(document.typeDefinitions.has(RDFS.label)).toBe(true);
	});

	it('counts the language tags of the source', async () => {
		const { document } = await loadPresetDocument('vocabularies/skos.ttl');

		expect(document.languageTagStats['en']).toBeGreaterThan(0);
	});

	it('provides a definition for every typed resource of every preset graph', async () => {
		const contexts: Record<string, PresetGraphDocument> = {};

		for (const graph of PRESET_GRAPHS) {
			const { document } = await loadPresetDocument(graph.path);

			contexts[document.uri.toString()] = document;
		}

		const provider = new ResourceDefinitionProvider({ contexts } as any);
		const primaryContext = createTurtleDocument('file:///empty.ttl');

		for (const graph of PRESET_GRAPHS) {
			const store = new Store();

			store.loadTurtle(graph.source, graph.graphIri, false);

			for (const quad of store.matchQuads(null, store.dataFactory.namedNode(RDF.type), null, null)) {
				if (quad.subject.termType !== 'NamedNode') {
					continue;
				}

				const location = provider.provideDefinitionForResource(primaryContext, quad.subject.value) as vscode.Location;

				expect(location?.uri.toString(), quad.subject.value).toMatch(/^mentor-vfs:/);
			}
		}
	});
});

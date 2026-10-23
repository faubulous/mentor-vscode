import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let vocabulary: any;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SettingsService') {
				// Use the default layout, which groups the definitions by their source.
				return { get: (_k: string, d?: any) => d, onDidChange: () => ({ dispose: () => {} }) };
			}
			if (token === 'VocabularyRepository') {
				return vocabulary;
			}
			if (token === 'DocumentContextService' || token === 'WorkspaceIndexerService') {
				return {
					onDidChangeDocumentContext: () => ({ dispose: () => {} }),
					onDidFinishIndexing: () => ({ dispose: () => {} }),
				};
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { Store, VocabularyRepository, OwlReasoner } from '@faubulous/mentor-rdf';
import { DefinitionNodeProvider } from '@src/views/trees/definition-tree/definition-node-provider';
import { TreeNode } from '@src/views/trees/tree-node';

/**
 * The vocabulary from faubulous/mentor-vscode#96: a concept scheme with two concept hierarchies
 * and a collection of concepts that is not associated with the concept scheme.
 */
const VOCABULARY = `
@prefix ct: <http://example.org/vocabulary/ct#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

ct: a skos:ConceptScheme ;
    skos:hasTopConcept ct:Kids, ct:Adults .

ct:Kids a skos:Concept ; skos:inScheme ct: ; skos:narrower ct:KidsAudience .
ct:KidsAudience a skos:Concept ; skos:inScheme ct: ; skos:broader ct:Kids .
ct:Adults a skos:Concept ; skos:inScheme ct: ; skos:narrower ct:AdultsAudience .
ct:AdultsAudience a skos:Concept ; skos:inScheme ct: ; skos:broader ct:Adults .

ct:Audience a skos:Collection ;
    skos:prefLabel "Audience" ;
    skos:member ct:KidsAudience, ct:AdultsAudience .
`;

/**
 * Gets the root nodes of the definition tree for a graph.
 * @param graph The URI of the graph to show.
 */
function getRootNodes(graph: string): TreeNode[] {
	const provider = new DefinitionNodeProvider();

	provider.document = {
		graphs: [graph],
		// Note: The local name is used as a label so that the expected output is easy to follow,
		// and the IRI if it has no local name.
		getResourceLabel: (uri: string) => ({ value: uri.split(/[#/]/).pop() || uri, language: undefined }),
		getResourceTooltip: () => undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
	} as any;

	return provider.getChildren(undefined) as TreeNode[];
}

/**
 * Renders the labels of a node and its descendants as indented lines.
 * @param node The node to render.
 * @param depth The indentation depth of the node.
 */
function render(node: TreeNode, depth = 0): string[] {
	const result = [`${'  '.repeat(depth)}${node.getLabel().label}`];

	for (const child of node.getChildren()) {
		result.push(...render(child, depth + 1));
	}

	return result;
}

describe('SKOS collections in the definition tree (faubulous/mentor-vscode#96)', () => {
	beforeAll(() => {
		const store = new Store(new OwlReasoner());

		store.loadTurtle(VOCABULARY, 'urn:collection');
		store.loadTurtle(VOCABULARY + 'ct:Audience skos:inScheme ct: .\n', 'urn:collection-in-scheme');

		vocabulary = new VocabularyRepository(store);
	});

	it('shows a collection that is not in a concept scheme below the unknown definition source', () => {
		const roots = getRootNodes('urn:collection');

		expect(roots.flatMap(root => render(root))).toEqual([
			'http://example.org/vocabulary/ct#',
			'  Concepts',
			'    Adults',
			'      AdultsAudience',
			'    Kids',
			'      KidsAudience',
			'Unknown',
			'  Collections',
			'    Audience',
			'      AdultsAudience',
			'      KidsAudience',
		]);
	});

	it('shows a collection in a concept scheme only as a collection of the scheme', () => {
		const roots = getRootNodes('urn:collection-in-scheme');

		expect(roots.flatMap(root => render(root))).toEqual([
			'http://example.org/vocabulary/ct#',
			'  Concepts',
			'    Adults',
			'      AdultsAudience',
			'    Kids',
			'      KidsAudience',
			'  Collections',
			'    Audience',
			'      AdultsAudience',
			'      KidsAudience',
		]);
	});
});

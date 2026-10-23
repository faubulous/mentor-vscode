import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let vocabulary: any;

/**
 * The layout of the definition tree, `undefined` for the default layout which groups the
 * definitions by their source.
 */
let layout: number | undefined;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: ServiceToken) => {
			if (token === ServiceToken.SettingsService) {
				return {
					get: (k: string, d?: any) => k === 'view.definitionTree.defaultLayout' ? layout ?? d : d,
					onDidChange: () => ({ dispose: () => {} }),
				};
			}
			if (token === ServiceToken.VocabularyRepository) {
				return vocabulary;
			}
			if (token === ServiceToken.DocumentContextService || token === ServiceToken.WorkspaceIndexerService) {
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
import { ServiceToken } from '@src/services/tokens';
import { DefinitionNodeProvider } from '@src/views/trees/definition-tree/definition-node-provider';
import { DefinitionTreeLayout } from '@src/services/core/settings-service';
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
 * The vocabulary from faubulous/mentor-vscode#101: a concept scheme and concepts that are not
 * associated with the concept scheme and cannot be reached from it.
 */
const UNSCOPED_CONCEPTS = `
@prefix ex: <http://example.org/vocab#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

ex:Scheme a skos:ConceptScheme ; skos:hasTopConcept ex:Top .
ex:Top a skos:Concept ; skos:inScheme ex:Scheme ; skos:narrower ex:Narrower .
ex:Narrower a skos:Concept .

ex:Orphan a skos:Concept ; skos:narrower ex:OrphanChild .
ex:OrphanChild a skos:Concept ; skos:broader ex:Orphan .
ex:Lonely a skos:Concept .
`;

/**
 * Creates a definition tree provider that shows a graph.
 * @param graph The URI of the graph to show.
 */
function createProvider(graph: string): DefinitionNodeProvider {
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

	return provider;
}

/**
 * Gets the root nodes of the definition tree for a graph.
 * @param graph The URI of the graph to show.
 */
function getRootNodes(graph: string): TreeNode[] {
	return createProvider(graph).getChildren(undefined) as TreeNode[];
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

beforeAll(() => {
	const store = new Store(new OwlReasoner());

	store.loadTurtle(VOCABULARY, 'urn:collection');
	store.loadTurtle(VOCABULARY + 'ct:Audience skos:inScheme ct: .\n', 'urn:collection-in-scheme');
	store.loadTurtle(UNSCOPED_CONCEPTS, 'urn:unscoped-concepts', true, false);

	vocabulary = new VocabularyRepository(store);
});

beforeEach(() => {
	layout = undefined;
});

describe('SKOS collections in the definition tree (faubulous/mentor-vscode#96)', () => {

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

describe('SKOS concepts outside of concept schemes in the definition tree (faubulous/mentor-vscode#101)', () => {
	it('shows the concepts that are not displayed below a concept scheme below the unknown definition source', () => {
		const roots = getRootNodes('urn:unscoped-concepts');

		expect(roots.flatMap(root => render(root))).toEqual([
			'Scheme',
			'  Concepts',
			'    Top',
			'      Narrower',
			'Unknown',
			'  Concepts',
			'    Lonely',
			'    Orphan',
			'      OrphanChild',
		]);

		const unknownConcepts = roots.find(root => root.getLabel().label === 'Unknown')!.getChildren()[0] as any;

		expect(unknownConcepts.getDescription()).toBe('3');
	});

	it('shows the concepts that are not displayed below a concept scheme as a root node when grouped by type', () => {
		layout = DefinitionTreeLayout.ByType;

		const roots = getRootNodes('urn:unscoped-concepts');

		expect(roots.flatMap(root => render(root))).toEqual([
			'Scheme',
			'  Concepts',
			'    Top',
			'      Narrower',
			'Concepts',
			'  Lonely',
			'  Orphan',
			'    OrphanChild',
		]);
	});

	it.each([
		['grouped by source', undefined],
		['grouped by type', DefinitionTreeLayout.ByType],
	])('resolves the tree nodes of concepts inside and outside of a concept scheme when %s', (_, treeLayout) => {
		layout = treeLayout;

		const provider = createProvider('urn:unscoped-concepts');

		for (const name of ['Top', 'Narrower', 'Orphan', 'OrphanChild', 'Lonely']) {
			const iri = `http://example.org/vocab#${name}`;

			expect(provider.getNodeForUri(iri)?.uri, name).toBe(iri);
		}
	});
});

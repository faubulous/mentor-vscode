import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let vocabulary: any;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SettingsService') {
				return { get: (_k: string, d?: any) => d };
			}
			if (token === 'VocabularyRepository') {
				return vocabulary;
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { Store, VocabularyRepository, RdfsReasoner } from '@faubulous/mentor-rdf';
import { CollectionsNode } from '@src/views/trees/definition-tree/nodes/collections/collections-node';
import { CollectionClassNode } from '@src/views/trees/definition-tree/nodes/collections/collection-class-node';
import { ConceptClassNode } from '@src/views/trees/definition-tree/nodes/concepts/concept-class-node';

/**
 * A concept scheme with a root collection that contains nested collections and concepts, plus a
 * collection that is not associated with the scheme. Mirrors src/rdf/tests/cases/valid-nested-collection.ttl
 * of mentor-rdf.
 */
const NESTED = `
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix : <http://example.org/> .

:Scheme a skos:ConceptScheme ; skos:hasTopConcept :concept1 .

:concept1 a skos:Concept ; skos:inScheme :Scheme ; skos:narrower :concept2 .
:concept2 a skos:Concept ; skos:inScheme :Scheme .
:concept3 a skos:Concept ; skos:inScheme :Scheme .
:concept4 a skos:Concept ; skos:inScheme :Scheme .

:Domains a skos:Collection ; skos:inScheme :Scheme ;
    skos:member :Domain1 , :Domain2 , :concept1 .

:Domain1 a skos:OrderedCollection ; skos:inScheme :Scheme ;
    skos:memberList ( :MicroThesaurus1 :concept2 :MicroThesaurus2 ) .

:Domain2 a skos:Collection ; skos:inScheme :Scheme ;
    skos:member :concept3 .

:MicroThesaurus1 a skos:Collection ; skos:inScheme :Scheme ;
    skos:member :concept2 , :concept4 .

:MicroThesaurus2 a skos:Collection ; skos:inScheme :Scheme ;
    skos:member :concept3 .

:Glossary a skos:Collection ; skos:member :concept4 .
`;

/**
 * Two collections that are members of each other and one collection that is a member of itself.
 * Mirrors src/rdf/tests/cases/valid-collection-cycle.ttl of mentor-rdf.
 */
const CYCLE = `
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix : <http://example.org/> .

:conceptA a skos:Concept .
:conceptB a skos:Concept .
:conceptC a skos:Concept .

:CollectionA a skos:Collection ; skos:member :CollectionB , :conceptA .
:CollectionB a skos:Collection ; skos:member :CollectionA , :conceptB .
:RecursiveCollection a skos:Collection ; skos:member :RecursiveCollection , :conceptC .
`;

const SCHEME = 'http://example.org/Scheme';

let graphs: string[] = [];

function makeContext(): any {
	return {
		graphs,
		// Note: The local name is used as a label so that the expected order is easy to follow.
		getResourceLabel: (uri: string) => ({ value: uri.split(/[#/]/).pop(), language: undefined }),
		getResourceTooltip: () => undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
	};
}

function makeCollectionsNode(options: any): CollectionsNode {
	return new CollectionsNode(makeContext(), '<mentor:collections>', 'mentor:collections', options);
}

/**
 * Render a node and all of its descendants as indented lines of `<label> [<icon>]`.
 */
function render(node: any, depth = 0): string[] {
	const icon = node.getIcon()?.id ?? '-';
	const result = [`${'  '.repeat(depth)}${node.getLabel().label} [${icon}]`];

	for (const child of node.getChildren()) {
		result.push(...render(child, depth + 1));
	}

	return result;
}

describe('CollectionsNode (with the vocabulary repository)', () => {
	beforeAll(() => {
		const store = new Store(new RdfsReasoner());

		store.loadTurtle(NESTED, 'urn:nested');
		store.loadTurtle(CYCLE, 'urn:cycle', true, false);

		vocabulary = new VocabularyRepository(store);
	});

	it('should render the collections of a scheme as a single nested structure', () => {
		graphs = ['urn:nested'];

		const node = makeCollectionsNode({ inScheme: SCHEME });

		expect(render(node)).toEqual([
			'Collections [-]',
			'  Domains [rdf-collection]',
			// Nested collections are listed before the concepts of a collection.
			'    Domain1 [rdf-collection-ordered]',
			// The order of the member list of an ordered collection is preserved.
			'      MicroThesaurus1 [rdf-collection]',
			'        concept2 [rdf-concept]',
			'        concept4 [rdf-concept]',
			'      concept2 [rdf-concept]',
			'      MicroThesaurus2 [rdf-collection]',
			'        concept3 [rdf-concept]',
			'    Domain2 [rdf-collection]',
			'      concept3 [rdf-concept]',
			'    concept1 [rdf-concept]',
			'      concept2 [rdf-concept]',
		]);

		// The description shows all collections of the scheme, not only the root collection.
		expect(node.getDescription()).toBe('5');
	});

	it('should list collections that are not associated with a concept scheme separately', () => {
		graphs = ['urn:nested'];

		expect(render(makeCollectionsNode({ inScheme: null }))).toEqual([
			'Collections [-]',
			'  Glossary [rdf-collection]',
			'    concept4 [rdf-concept]',
		]);
	});

	it('should resolve a nested collection for reveal', () => {
		graphs = ['urn:nested'];

		const node = makeCollectionsNode({ inScheme: SCHEME });
		const found = node.resolveNodeForUri('http://example.org/MicroThesaurus2');

		expect(found).toBeInstanceOf(CollectionClassNode);
		expect(found!.uri).toBe('http://example.org/MicroThesaurus2');

		expect(node.resolveNodeForUri('http://example.org/concept1')).toBeUndefined();
	});

	it('should keep every collection visible and terminate on cyclic definitions', () => {
		graphs = ['urn:cycle'];

		const lines = render(makeCollectionsNode({ inScheme: null }));

		expect(lines.some(l => l.includes('CollectionA'))).toBe(true);
		expect(lines.some(l => l.includes('CollectionB'))).toBe(true);
		expect(lines.some(l => l.includes('RecursiveCollection'))).toBe(true);
	});

	it('should build collection nodes for collection members and concept nodes for concept members', () => {
		graphs = ['urn:nested'];

		const node = new CollectionClassNode(makeContext(), '<x>', 'http://example.org/Domains');
		const children = node.getChildren();

		expect(children.filter(c => c instanceof CollectionClassNode).length).toBe(2);
		expect(children.filter(c => c instanceof ConceptClassNode).length).toBe(1);
	});
});

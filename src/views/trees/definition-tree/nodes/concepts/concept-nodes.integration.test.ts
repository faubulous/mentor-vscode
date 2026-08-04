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
import { ConceptSchemeNode } from '@src/views/trees/definition-tree/nodes/concept-scheme-node';
import { ConceptsNode } from '@src/views/trees/definition-tree/nodes/concepts/concepts-node';

/**
 * Four concept schemes with one top concept each. The tasks are associated with `:TaskScheme` but
 * their broader concepts are of `:GroupScheme`, and `:scope--offshore-deep` has no scheme at all.
 * Mirrors src/rdf/tests/cases/valid-multi-scheme.ttl of mentor-rdf.
 */
const SCHEMES = `
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix : <http://example.org/> .

:GroupScheme  a skos:ConceptScheme ; skos:hasTopConcept :group--root .
:TaskScheme   a skos:ConceptScheme ; skos:hasTopConcept :task--root .
:ScopeScheme  a skos:ConceptScheme ; skos:hasTopConcept :scope--root .
:StreamScheme a skos:ConceptScheme ; skos:hasTopConcept :stream--root .

:group--root  a skos:Concept ; skos:inScheme :GroupScheme  ; skos:topConceptOf :GroupScheme .
:task--root   a skos:Concept ; skos:inScheme :TaskScheme   ; skos:topConceptOf :TaskScheme .
:scope--root  a skos:Concept ; skos:inScheme :ScopeScheme  ; skos:topConceptOf :ScopeScheme .
:stream--root a skos:Concept ; skos:inScheme :StreamScheme ; skos:topConceptOf :StreamScheme .

:group--installation a skos:Concept ; skos:inScheme :GroupScheme ; skos:broader :group--root .
:group--downtime     a skos:Concept ; skos:inScheme :GroupScheme ; skos:broader :group--root .

:task--install-foundation a skos:Concept ; skos:inScheme :TaskScheme ; skos:broader :group--installation .
:task--install-platform   a skos:Concept ; skos:inScheme :TaskScheme ; skos:broader :group--installation .
:task--wait-on-weather    a skos:Concept ; skos:inScheme :TaskScheme ; skos:broader :group--downtime .
:task--install-platform-railing a skos:Concept ; skos:inScheme :TaskScheme ; skos:broader :task--install-platform .

:scope--offshore      a skos:Concept ; skos:inScheme :ScopeScheme ; skos:broader :scope--root .
:scope--offshore-deep a skos:Concept ;                              skos:broader :scope--offshore .

:stream--critical-path a skos:Concept ; skos:inScheme :StreamScheme ; skos:broader :stream--root .
:stream--parallel      a skos:Concept ; skos:inScheme :StreamScheme ; skos:broader :stream--root .
`;

const GRAPH = 'urn:schemes';

function makeContext(): any {
	return {
		graphs: [GRAPH],
		getResourceLabel: (uri: string) => ({ value: uri.split(/[#/]/).pop(), language: undefined }),
		getResourceTooltip: () => undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
	};
}

/**
 * Get the concepts node of a concept scheme, as the tree builds it.
 */
function getConceptsNode(schemeUri: string): ConceptsNode {
	const scheme = new ConceptSchemeNode(makeContext(), `<${schemeUri}>`, schemeUri);
	const node = scheme.getChildren().find(c => c instanceof ConceptsNode);

	expect(node).toBeDefined();

	return node as ConceptsNode;
}

/**
 * Count the nodes below a node, which is what expanding it reveals.
 */
function countDescendants(node: any): number {
	let result = 0;

	for (const child of node.getChildren()) {
		result += 1 + countDescendants(child);
	}

	return result;
}

function labelsOf(node: any): string[] {
	return node.getChildren().map((c: any) => c.getLabel().label).sort();
}

describe('ConceptsNode (with the vocabulary repository)', () => {
	beforeAll(() => {
		const store = new Store(new RdfsReasoner());

		store.loadTurtle(SCHEMES, GRAPH);

		vocabulary = new VocabularyRepository(store);
	});

	it('should report a count that matches what expanding the node reveals', () => {
		const expected: { [scheme: string]: number } = {
			'http://example.org/GroupScheme': 3,
			'http://example.org/TaskScheme': 5,
			'http://example.org/ScopeScheme': 3,
			'http://example.org/StreamScheme': 3,
		};

		for (const scheme of Object.keys(expected)) {
			const node = getConceptsNode(scheme);

			expect(node.getDescription(), scheme).toBe(expected[scheme].toString());
			expect(countDescendants(node), scheme).toBe(expected[scheme]);
		}
	});

	it('should not count the concepts of the other schemes', () => {
		const total = [...vocabulary.getConcepts([GRAPH])].length;

		expect(total).toBe(14);

		// Every scheme used to report the document-wide total.
		expect(getConceptsNode('http://example.org/GroupScheme').getDescription()).not.toBe(total.toString());
	});

	it('should list the concepts of a scheme whose broader concepts are of another scheme', () => {
		// The tasks are only reachable through the group hierarchy, so the task scheme used to show
		// nothing but its own root concept.
		expect(labelsOf(getConceptsNode('http://example.org/TaskScheme'))).toEqual([
			'task--install-foundation',
			'task--install-platform',
			'task--root',
			'task--wait-on-weather',
		]);
	});

	it('should not display concepts of another scheme below a concept', () => {
		const node = getConceptsNode('http://example.org/GroupScheme');
		const root = node.getChildren()[0];

		expect(labelsOf(root)).toEqual(['group--downtime', 'group--installation']);

		// The tasks are narrower concepts of the groups, but they are of the task scheme.
		for (const group of root.getChildren()) {
			expect(labelsOf(group)).toEqual([]);
		}
	});

	it('should display a concept without any scheme below the scheme it is reached from', () => {
		const node = getConceptsNode('http://example.org/ScopeScheme');
		const root = node.getChildren()[0];
		const offshore = root.getChildren()[0] as any;

		expect(offshore.getLabel().label).toBe('scope--offshore');
		expect(labelsOf(offshore)).toEqual(['scope--offshore-deep']);
	});
});

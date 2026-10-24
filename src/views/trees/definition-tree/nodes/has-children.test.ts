import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockVocabularyStub: any;
let mockSettingsGet: (key: string, defaultValue?: any) => any;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === ServiceToken.SettingsService) {
				return { get: (k: string, d?: any) => mockSettingsGet(k, d) };
			}
			if (token === ServiceToken.VocabularyRepository) {
				return mockVocabularyStub;
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { ServiceToken } from '@src/services/tokens';
import { DefinitionTreeNode } from '@src/views/trees/definition-tree/definition-tree-node';
import { OntologyNode } from '@src/views/trees/definition-tree/nodes/ontology-node';
import { ConceptSchemeNode } from '@src/views/trees/definition-tree/nodes/concept-scheme-node';
import { PropertyNode } from '@src/views/trees/definition-tree/nodes/properties/property-node';
import { PropertyClassNode } from '@src/views/trees/definition-tree/nodes/properties/property-class-node';
import { IndividualsNode } from '@src/views/trees/definition-tree/nodes/individuals/individuals-node';
import { NodeShapeNode, PropertyShapeNode } from '@src/views/trees/definition-tree/nodes/shapes/shape-node';

/**
 * Creates a generator stub that yields the given IRIs.
 */
function yields(...iris: string[]) {
	return vi.fn(function* () {
		yield* iris;
	});
}

function makeContext(): any {
	return {
		graphs: ['urn:g1'],
		getResourceLabel: (iri: string) => ({ value: iri, language: undefined }),
		getResourceTooltip: () => undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
	};
}

/**
 * Creates a node factory for a node type, so that each assertion can use a fresh node.
 */
function factory(NodeConstructor: new (context: any, id: string, uri: string) => DefinitionTreeNode, uri = 'urn:ex#x') {
	return () => new NodeConstructor(makeContext(), `root/<${uri}>`, uri);
}

/**
 * Asserts that {@link DefinitionTreeNode.hasChildren} returns the expected value without
 * building the children, and that it agrees with `getChildren().length > 0`.
 * @param createNode Creates a fresh node of the type under test.
 * @param expected The expected result.
 */
function expectHasChildren(createNode: () => DefinitionTreeNode, expected: boolean) {
	const node = createNode();
	const getChildren = vi.spyOn(node, 'getChildren');

	expect(node.hasChildren()).toBe(expected);
	expect(getChildren).not.toHaveBeenCalled();
	expect(createNode().getChildren().length > 0).toBe(expected);
}

beforeEach(() => {
	mockSettingsGet = (k: string, d?: any) => {
		if (k === 'view.showReferences') return true;
		return d;
	};
	mockVocabularyStub = {
		getSubClasses: yields(),
		getSubjectsOfType: yields(),
		hasSubjectsOfType: vi.fn(() => false),
		getPropertyTypes: yields(),
		getSubProperties: yields(),
		getRootPropertiesOfType: yields(),
		getIndividualTypes: yields(),
		getIndividuals: yields(),
		getUnscopedRootConcepts: yields(),
		getNarrowerConcepts: yields(),
		getRootCollections: yields(),
		getCollectionMembers: yields(),
		isCollection: vi.fn(() => false),
		isOrderedCollection: vi.fn(() => false),
	};
});

describe('hasChildren overrides', () => {
	describe('PropertyNode', () => {
		it('should return true when the property has sub properties', () => {
			mockVocabularyStub.getSubProperties = yields('urn:ex#sub');
			expectHasChildren(factory(PropertyNode), true);
		});

		it('should return false when the property has no sub properties', () => {
			expectHasChildren(factory(PropertyNode), false);
		});
	});

	describe('PropertyClassNode', () => {
		it('should return true when the property type has root properties', () => {
			mockVocabularyStub.getRootPropertiesOfType = yields('urn:ex#p');
			expectHasChildren(factory(PropertyClassNode), true);
		});

		it('should return false when the property type has no root properties', () => {
			expectHasChildren(factory(PropertyClassNode), false);
		});

		it('should return false when the property type only has sub classes and no root properties', () => {
			mockVocabularyStub.getSubClasses = yields('urn:ex#SubType');
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => true);
			expectHasChildren(factory(PropertyClassNode), false);
		});
	});

	describe('IndividualsNode', () => {
		it('should return true when there are individual types', () => {
			mockVocabularyStub.getIndividualTypes = yields('urn:ex#Type');
			expectHasChildren(factory(IndividualsNode, 'mentor:individuals'), true);
		});

		it('should return false when there are no individual types', () => {
			mockVocabularyStub.getIndividuals = yields('urn:ex#i');
			expectHasChildren(factory(IndividualsNode, 'mentor:individuals'), false);
		});

		it('should return true when there are individuals and types are not shown', () => {
			mockSettingsGet = (k: string, d?: any) => k === 'view.showIndividualTypes' ? false : d;
			mockVocabularyStub.getIndividuals = yields('urn:ex#i');
			expectHasChildren(factory(IndividualsNode, 'mentor:individuals'), true);
		});

		it('should return false when there are no individuals and types are not shown', () => {
			mockSettingsGet = (k: string, d?: any) => k === 'view.showIndividualTypes' ? false : d;
			mockVocabularyStub.getIndividualTypes = yields('urn:ex#Type');
			expectHasChildren(factory(IndividualsNode, 'mentor:individuals'), false);
		});
	});

	describe('NodeShapeNode', () => {
		it('should return false even when the shape has sub classes and instances', () => {
			mockVocabularyStub.getSubClasses = yields('urn:ex#SubShape');
			mockVocabularyStub.getSubjectsOfType = yields('urn:ex#instance');
			expectHasChildren(factory(NodeShapeNode), false);
		});
	});

	describe('PropertyShapeNode', () => {
		it('should return false even when the shape has sub properties', () => {
			mockVocabularyStub.getSubProperties = yields('urn:ex#sub');
			expectHasChildren(factory(PropertyShapeNode), false);
		});
	});

	describe('OntologyNode', () => {
		it('should return true when a group node has children', () => {
			mockVocabularyStub.getPropertyTypes = yields('urn:ex#PropertyType');
			expectHasChildren(factory(OntologyNode), true);
		});

		it('should return false when no group node has children', () => {
			expectHasChildren(factory(OntologyNode), false);
		});

		it('should stop at the first group node that has children', () => {
			mockVocabularyStub.getSubClasses = yields('urn:ex#Class');

			expect(factory(OntologyNode)().hasChildren()).toBe(true);
			expect(mockVocabularyStub.getPropertyTypes).not.toHaveBeenCalled();
		});

		it('should test each group node only once for hasChildren, getChildren and their collapsible states', () => {
			mockVocabularyStub.getSubClasses = yields('urn:ex#Class');

			const node = factory(OntologyNode)();

			node.getCollapsibleState();

			for (const child of node.getChildren()) {
				child.getCollapsibleState();
			}

			// Note: The 'Classes' group queries the root classes, the shape, rule and validator groups query sub classes.
			const rootClassQueries = mockVocabularyStub.getSubClasses.mock.calls.filter((call: any[]) => call[1] === undefined);

			expect(rootClassQueries).toHaveLength(1);
			expect(mockVocabularyStub.getPropertyTypes).toHaveBeenCalledTimes(1);
		});
	});

	describe('ConceptSchemeNode', () => {
		it('should return true when the scheme has concepts', () => {
			mockVocabularyStub.getNarrowerConcepts = yields('urn:ex#c');
			expectHasChildren(factory(ConceptSchemeNode), true);
		});

		it('should return true when the scheme has collections', () => {
			mockVocabularyStub.getRootCollections = yields('urn:ex#col');
			expectHasChildren(factory(ConceptSchemeNode), true);
		});

		it('should return false when the scheme has no concepts and no collections', () => {
			expectHasChildren(factory(ConceptSchemeNode), false);
		});
	});
});

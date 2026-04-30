import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockVocabularyStub: any;
let mockSettingsGet: (key: string, defaultValue?: any) => any;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SettingsService') {
				return { get: (k: string, d?: any) => mockSettingsGet(k, d) };
			}
			if (token === 'VocabularyRepository') {
				return mockVocabularyStub;
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { ConceptSchemeNode } from '@src/views/trees/definition-tree/nodes/concept-scheme-node';
import { ConceptsNode } from '@src/views/trees/definition-tree/nodes/concepts/concepts-node';
import { CollectionsNode } from '@src/views/trees/definition-tree/nodes/collections/collections-node';

function makeContext(): any {
	return {
		graphs: ['urn:g1'],
		getResourceLabel: () => ({ value: 'Label', language: undefined }),
		getResourceTooltip: () => undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
	};
}

function makeNode<T>(Ctor: new (ctx: any, id: string, uri: string) => T, uri = 'urn:ex#x'): T {
	return new Ctor(makeContext(), `root/<${uri}>`, uri);
}

beforeEach(() => {
	mockSettingsGet = (k: string, d?: any) => {
		if (k === 'view.showReferences') return true;
		return d;
	};
	mockVocabularyStub = {
		// ConceptsNode / ConceptClassNode
		getNarrowerConcepts: vi.fn(function*() {}),
		getConcepts: vi.fn(function*() {}),
		getSubjectsOfType: vi.fn(function*() {}),
		hasIndividuals: vi.fn(() => false),
		getConceptSchemePath: vi.fn(() => []),
		// CollectionsNode
		getCollections: vi.fn(function*() {}),
		getCollectionMembers: vi.fn(function*() {}),
		isOrderedCollection: vi.fn(() => false),
	};
});

describe('ConceptSchemeNode', () => {
	describe('getIcon', () => {
		it('should return ThemeIcon with "rdf-concept-scheme"', () => {
			const icon = makeNode(ConceptSchemeNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect((icon as any).id).toBe('rdf-concept-scheme');
		});
	});

	describe('getIconColor', () => {
		it('should return ThemeColor mentor.color.class', () => {
			const color = makeNode(ConceptSchemeNode).getIconColor();
			expect(color).toBeInstanceOf(vscode.ThemeColor);
			expect((color as any).id).toBe('mentor.color.class');
		});
	});

	describe('hasChildren', () => {
		it('should return false when no concepts and no collections', () => {
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() {});
			mockVocabularyStub.getCollections = vi.fn(function*() {});
			expect(makeNode(ConceptSchemeNode).hasChildren()).toBe(false);
		});

		it('should return true when there are narrower concepts', () => {
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() { yield 'urn:ex#c1'; });
			expect(makeNode(ConceptSchemeNode).hasChildren()).toBe(true);
		});

		it('should return true when there are collections', () => {
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() {});
			mockVocabularyStub.getCollections = vi.fn(function*() { yield 'urn:ex#col1'; });
			expect(makeNode(ConceptSchemeNode).hasChildren()).toBe(true);
		});
	});

	describe('getChildren', () => {
		it('should return empty array when no concepts or collections', () => {
			expect(makeNode(ConceptSchemeNode).getChildren()).toEqual([]);
		});

		it('should include ConceptsNode when concepts exist', () => {
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() { yield 'urn:ex#c1'; });
			const children = makeNode(ConceptSchemeNode).getChildren();
			expect(children.some(c => c instanceof ConceptsNode)).toBe(true);
		});

		it('should include CollectionsNode when collections exist', () => {
			mockVocabularyStub.getCollections = vi.fn(function*() { yield 'urn:ex#col1'; });
			const children = makeNode(ConceptSchemeNode).getChildren();
			expect(children.some(c => c instanceof CollectionsNode)).toBe(true);
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when no children contain the URI', () => {
			expect(makeNode(ConceptSchemeNode).resolveNodeForUri('urn:ex#z')).toBeUndefined();
		});

		it('should return the node when a child resolves the URI', () => {
			// Set up a concept that has a scheme path leading back to this scheme
			const conceptIri = 'urn:ex#c1';
			// Make getNarrowerConcepts yield the concept so ConceptsNode.hasChildren() is true
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() { yield conceptIri; });
			// getConceptSchemePath returns a path so walkHierarchyPath finds the node
			// Path: [conceptIri] (already at top-level, scheme stripped makes walkPath = [conceptIri])
			mockVocabularyStub.getConceptSchemePath = vi.fn((g: any, iri: any) => {
				if (iri === conceptIri) return [conceptIri];
				return [];
			});
			// Make the ConceptsNode URI match 'mentor:concepts' so schemeIndex is not found
			// walkPath = [conceptIri] → finds the child in getNarrowerConcepts
			const node = makeNode(ConceptSchemeNode, 'urn:ex#scheme');
			const result = node.resolveNodeForUri(conceptIri);
			expect(result).not.toBeUndefined();
		});

		it('should return undefined when child does not resolve the URI', () => {
			// Loop runs (children exist) but child.resolveNodeForUri(iri) returns undefined
			// Covers the if(found) FALSE branch inside the loop
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() { yield 'urn:ex#c1'; }); // children exist
			mockVocabularyStub.getConceptSchemePath = vi.fn(() => []); // empty path → can't resolve target
			const node = makeNode(ConceptSchemeNode, 'urn:ex#scheme');
			expect(node.resolveNodeForUri('urn:ex#notFound')).toBeUndefined();
		});
	});
});

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
import { ConceptClassNode } from '../concepts/concept-class-node';
import { CollectionClassNode } from './collection-class-node';
import { CollectionsNode } from './collections-node';

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
		hasIndividuals: vi.fn(() => false),
		getCollections: vi.fn(function*() {}),
		getCollectionMembers: vi.fn(function*() {}),
		isOrderedCollection: vi.fn(() => false),
		getNarrowerConcepts: vi.fn(function*() {}),
		getSubjectsOfType: vi.fn(function*() {}),
		getSubClasses: vi.fn(function*() {}),
		getConcepts: vi.fn(function*() {}),
	};
});

// ---- CollectionClassNode ----

describe('CollectionClassNode', () => {
	describe('getIcon', () => {
		it('should return ThemeIcon with "rdf-collection" for unordered', () => {
			mockVocabularyStub.isOrderedCollection = vi.fn(() => false);
			const icon = makeNode(CollectionClassNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect((icon as any).id).toBe('rdf-collection');
		});

		it('should return ThemeIcon with "rdf-collection-ordered" for ordered', () => {
			mockVocabularyStub.isOrderedCollection = vi.fn(() => true);
			const icon = makeNode(CollectionClassNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect((icon as any).id).toBe('rdf-collection-ordered');
		});
	});

	describe('getIconColor', () => {
		it('should return ThemeColor mentor.color.concept', () => {
			const color = makeNode(CollectionClassNode).getIconColor();
			expect(color).toBeInstanceOf(vscode.ThemeColor);
			expect((color as any).id).toBe('mentor.color.concept');
		});
	});

	describe('hasChildren', () => {
		it('should return false when no members', () => {
			mockVocabularyStub.getCollectionMembers = vi.fn(function*() {});
			expect(makeNode(CollectionClassNode).hasChildren()).toBe(false);
		});

		it('should return true when members exist', () => {
			mockVocabularyStub.getCollectionMembers = vi.fn(function*() { yield 'urn:ex#m'; });
			expect(makeNode(CollectionClassNode).hasChildren()).toBe(true);
		});
	});

	describe('getChildren', () => {
		it('should return empty array when no members', () => {
			mockVocabularyStub.getCollectionMembers = vi.fn(function*() {});
			expect(makeNode(CollectionClassNode).getChildren()).toEqual([]);
		});

		it('should return ConceptClassNode children in sorted order (unordered)', () => {
			mockVocabularyStub.getCollectionMembers = vi.fn(function*() {
				yield 'urn:ex#m2';
				yield 'urn:ex#m1';
			});
			mockVocabularyStub.isOrderedCollection = vi.fn(() => false);
			const children = makeNode(CollectionClassNode).getChildren();
			expect(children).toHaveLength(2);
			expect(children[0]).toBeInstanceOf(ConceptClassNode);
		});

		it('should preserve order for ordered collections', () => {
			mockVocabularyStub.getCollectionMembers = vi.fn(function*() {
				yield 'urn:ex#m2';
				yield 'urn:ex#m1';
			});
			mockVocabularyStub.isOrderedCollection = vi.fn(() => true);
			const children = makeNode(CollectionClassNode).getChildren();
			expect(children).toHaveLength(2);
			expect((children[0] as any).uri).toBe('urn:ex#m2');
		});
	});

	describe('getClassNode', () => {
		it('should return a ConceptClassNode', () => {
			expect(makeNode(CollectionClassNode).getClassNode('urn:ex#c')).toBeInstanceOf(ConceptClassNode);
		});
	});

	describe('getIndividualNode', () => {
		it('should return a ConceptClassNode', () => {
			expect(makeNode(CollectionClassNode).getIndividualNode('urn:ex#i')).toBeInstanceOf(ConceptClassNode);
		});
	});
});

// ---- CollectionsNode ----

describe('CollectionsNode', () => {
	describe('getContextValue', () => {
		it('should return "collections"', () => {
			expect(makeNode(CollectionsNode).getContextValue()).toBe('collections');
		});
	});

	describe('getIcon', () => {
		it('should return undefined', () => {
			expect(makeNode(CollectionsNode).getIcon()).toBeUndefined();
		});
	});

	describe('getLabel', () => {
		it('should return "Collections"', () => {
			expect(makeNode(CollectionsNode).getLabel()).toEqual({ label: 'Collections' });
		});
	});

	describe('getTooltip', () => {
		it('should return undefined', () => {
			expect(makeNode(CollectionsNode).getTooltip()).toBeUndefined();
		});
	});

	describe('getDescription', () => {
		it('should return count of collections', () => {
			mockVocabularyStub.getCollections = vi.fn(function*() { yield 'urn:ex#c1'; yield 'urn:ex#c2'; });
			expect(makeNode(CollectionsNode).getDescription()).toBe('2');
		});
	});

	describe('hasChildren', () => {
		it('should return false when no collections', () => {
			mockVocabularyStub.getCollections = vi.fn(function*() {});
			expect(makeNode(CollectionsNode).hasChildren()).toBe(false);
		});

		it('should return true when collections exist', () => {
			mockVocabularyStub.getCollections = vi.fn(function*() { yield 'urn:ex#c1'; });
			expect(makeNode(CollectionsNode).hasChildren()).toBe(true);
		});
	});

	describe('getChildren', () => {
		it('should return CollectionClassNode children sorted by label', () => {
			mockVocabularyStub.getCollections = vi.fn(function*() { yield 'urn:ex#c1'; yield 'urn:ex#c2'; });
			const children = makeNode(CollectionsNode).getChildren();
			expect(children).toHaveLength(2);
			expect(children[0]).toBeInstanceOf(CollectionClassNode);
		});

		it('should return empty array when no collections', () => {
			mockVocabularyStub.getCollections = vi.fn(function*() {});
			expect(makeNode(CollectionsNode).getChildren()).toEqual([]);
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when URI does not match any child', () => {
			mockVocabularyStub.getCollections = vi.fn(function*() { yield 'urn:ex#col1'; });
			expect(makeNode(CollectionsNode).resolveNodeForUri('urn:ex#not-found')).toBeUndefined();
		});

		it('should return the matching child node', () => {
			mockVocabularyStub.getCollections = vi.fn(function*() { yield 'urn:ex#col1'; });
			const found = makeNode(CollectionsNode).resolveNodeForUri('urn:ex#col1');
			expect(found).toBeInstanceOf(CollectionClassNode);
		});
	});
});

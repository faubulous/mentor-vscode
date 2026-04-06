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
import { ConceptSchemeNode } from './concept-scheme-node';
import { ConceptsNode } from './concepts/concepts-node';
import { CollectionsNode } from './collections/collections-node';

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
	});
});

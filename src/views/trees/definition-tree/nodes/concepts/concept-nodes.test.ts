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
import { ConceptClassNode } from './concept-class-node';
import { ConceptsNode } from './concepts-node';

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
		getSubClasses: vi.fn(function*() {}),
		getSubjectsOfType: vi.fn(function*() {}),
		getNarrowerConcepts: vi.fn(function*() {}),
		getConcepts: vi.fn(function*() {}),
		getConceptSchemePath: vi.fn(() => []),
	};
});

// ---- ConceptClassNode ----

describe('ConceptClassNode', () => {
	describe('getIcon', () => {
		it('should return a ThemeIcon for rdf-concept', () => {
			const icon = makeNode(ConceptClassNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect(icon?.id).toBe('rdf-concept');
		});
	});

	describe('getIconColor', () => {
		it('should return ThemeColor for mentor.color.concept', () => {
			expect(makeNode(ConceptClassNode).getIconColor()).toBeInstanceOf(vscode.ThemeColor);
		});
	});

	describe('getSubClassIris', () => {
		it('should delegate to vocabulary.getNarrowerConcepts', () => {
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() { yield 'urn:ex#Narrower'; });
			const iris = [...makeNode(ConceptClassNode).getSubClassIris()];
			expect(iris).toEqual(['urn:ex#Narrower']);
		});
	});

	describe('getClassNode', () => {
		it('should return a ConceptClassNode', () => {
			expect(makeNode(ConceptClassNode).getClassNode('urn:ex#sub')).toBeInstanceOf(ConceptClassNode);
		});
	});

	describe('getIndividualNode', () => {
		it('should return a ConceptClassNode', () => {
			expect(makeNode(ConceptClassNode).getIndividualNode('urn:ex#ind')).toBeInstanceOf(ConceptClassNode);
		});
	});
});

// ---- ConceptsNode ----

describe('ConceptsNode', () => {
	describe('getContextValue', () => {
		it('should return "concepts"', () => {
			expect(makeNode(ConceptsNode).getContextValue()).toBe('concepts');
		});
	});

	describe('getIcon', () => {
		it('should return undefined', () => {
			expect(makeNode(ConceptsNode).getIcon()).toBeUndefined();
		});
	});

	describe('getLabel', () => {
		it('should return "Concepts"', () => {
			expect(makeNode(ConceptsNode).getLabel()).toEqual({ label: 'Concepts' });
		});
	});

	describe('getTooltip', () => {
		it('should return undefined', () => {
			expect(makeNode(ConceptsNode).getTooltip()).toBeUndefined();
		});
	});

	describe('getDescription', () => {
		it('should return count of concepts as string', () => {
			mockVocabularyStub.getConcepts = vi.fn(function*() { yield 'urn:ex#c1'; yield 'urn:ex#c2'; });
			expect(makeNode(ConceptsNode).getDescription()).toBe('2');
		});
	});

	describe('getSubClassIris', () => {
		it('should delegate to vocabulary.getNarrowerConcepts with the subject', () => {
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() { yield 'urn:ex#Narrower'; });
			const iris = [...makeNode(ConceptsNode).getSubClassIris()];
			expect(iris).toEqual(['urn:ex#Narrower']);
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when concept scheme path is empty', () => {
			mockVocabularyStub.getConceptSchemePath = vi.fn(() => []);
			expect(makeNode(ConceptsNode).resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});

		it('should return undefined when concept scheme path is null', () => {
			mockVocabularyStub.getConceptSchemePath = vi.fn(() => null);
			expect(makeNode(ConceptsNode).resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});

		it('should return undefined when walkPath is empty after removing scheme', () => {
			const schemeUri = 'urn:ex#x';
			// path has only the scheme itself
			mockVocabularyStub.getConceptSchemePath = vi.fn(() => [schemeUri]);
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() {});
			const ctx = { ...makeContext() };
			// Make the node have the same URI as the scheme
			const node = new ConceptsNode(ctx, `root/<${schemeUri}>`, schemeUri);
			expect(node.resolveNodeForUri(schemeUri)).toBeUndefined();
		});
	});
});

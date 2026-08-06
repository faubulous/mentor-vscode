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
import { ConceptClassNode } from '@src/views/trees/definition-tree/nodes/concepts/concept-class-node';
import { ConceptsNode } from '@src/views/trees/definition-tree/nodes/concepts/concepts-node';

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
		getAllConceptsInScheme: vi.fn(function*() {}),
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

		it('should pass the inScheme option on, so narrower concepts stay within the scheme', () => {
			const scheme = 'urn:ex#scheme';
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() {});
			const node = new ConceptClassNode(makeContext(), 'root/<urn:ex#c>', 'urn:ex#c', { inScheme: scheme } as any);

			expect([...node.getSubClassIris()]).toEqual([]);
			expect(mockVocabularyStub.getNarrowerConcepts).toHaveBeenCalledWith(
				['urn:g1'],
				'urn:ex#c',
				expect.objectContaining({ inScheme: scheme })
			);
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
		it('should return the count of concepts of the scheme as string', () => {
			mockVocabularyStub.getAllConceptsInScheme = vi.fn(function*() { yield 'urn:ex#c1'; yield 'urn:ex#c2'; });
			expect(makeNode(ConceptsNode).getDescription()).toBe('2');
		});

		it('should not count the concepts of other schemes', () => {
			// The document has more concepts than the scheme, which is what getConcepts would return.
			mockVocabularyStub.getConcepts = vi.fn(function*() { yield 'urn:ex#c1'; yield 'urn:ex#c2'; yield 'urn:ex#other'; });
			mockVocabularyStub.getAllConceptsInScheme = vi.fn(function*() { yield 'urn:ex#c1'; yield 'urn:ex#c2'; });
			expect(makeNode(ConceptsNode).getDescription()).toBe('2');
		});

		it('should count the concepts of the scheme given by the inScheme option', () => {
			const scheme = 'urn:ex#scheme';
			mockVocabularyStub.getAllConceptsInScheme = vi.fn(function*(_g: any, s: string) {
				if (s === scheme) { yield 'urn:ex#c1'; }
			});
			const node = new ConceptsNode(makeContext(), 'root/<mentor:concepts>', 'mentor:concepts', { inScheme: scheme } as any);
			expect(node.getDescription()).toBe('1');
		});

		it('should compute the count only once per node', () => {
			mockVocabularyStub.getAllConceptsInScheme = vi.fn(function*() { yield 'urn:ex#c1'; });
			const node = makeNode(ConceptsNode);
			node.getDescription();
			node.getDescription();
			expect(mockVocabularyStub.getAllConceptsInScheme).toHaveBeenCalledTimes(1);
		});
	});

	describe('getSubClassIris', () => {
		it('should delegate to vocabulary.getNarrowerConcepts with the subject', () => {
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() { yield 'urn:ex#Narrower'; });
			const iris = [...makeNode(ConceptsNode).getSubClassIris()];
			expect(iris).toEqual(['urn:ex#Narrower']);
		});

		it('should query the scheme given by the inScheme option and pass it on', () => {
			const scheme = 'urn:ex#scheme';
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() { yield 'urn:ex#Top'; });
			const node = new ConceptsNode(makeContext(), 'root/<mentor:concepts>', 'mentor:concepts', { inScheme: scheme } as any);

			expect([...node.getSubClassIris()]).toEqual(['urn:ex#Top']);
			expect(mockVocabularyStub.getNarrowerConcepts).toHaveBeenCalledWith(
				['urn:g1'],
				scheme,
				expect.objectContaining({ inScheme: scheme })
			);
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when the concept is not a child of the scheme', () => {
			mockVocabularyStub.getConceptSchemePath = vi.fn(() => []);
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() {});
			expect(makeNode(ConceptsNode).resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});

		it('should return undefined when concept scheme path is null', () => {
			mockVocabularyStub.getConceptSchemePath = vi.fn(() => null);
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() {});
			expect(makeNode(ConceptsNode).resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});

		it('should resolve a top concept whose path contains only the scheme', () => {
			const schemeUri = 'urn:ex#scheme';
			const conceptIri = 'urn:ex#concept1';
			// The path of a top concept contains the scheme, but not the concept itself.
			mockVocabularyStub.getConceptSchemePath = vi.fn(() => [schemeUri]);
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*() { yield conceptIri; });
			const node = new ConceptsNode(makeContext(), `root/<${schemeUri}>`, schemeUri);
			const result = node.resolveNodeForUri(conceptIri);
			expect(result).not.toBeUndefined();
			expect((result as any).uri).toBe(conceptIri);
		});

		it('should resolve a narrower concept by walking its broader concepts', () => {
			const schemeUri = 'urn:ex#scheme';
			const broaderIri = 'urn:ex#concept1';
			const conceptIri = 'urn:ex#concept2';
			// The path is ordered from the closest broader concept to the scheme.
			mockVocabularyStub.getConceptSchemePath = vi.fn(() => [broaderIri, schemeUri]);
			mockVocabularyStub.getNarrowerConcepts = vi.fn(function*(_g: any, subject: string) {
				if (subject === schemeUri) { yield broaderIri; }
				if (subject === broaderIri) { yield conceptIri; }
			});
			const node = new ConceptsNode(makeContext(), `root/<${schemeUri}>`, schemeUri);
			const result = node.resolveNodeForUri(conceptIri);
			expect(result).not.toBeUndefined();
			expect((result as any).uri).toBe(conceptIri);
		});
	});
});

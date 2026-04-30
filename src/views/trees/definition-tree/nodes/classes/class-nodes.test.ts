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
import { ClassNode } from '@src/views/trees/definition-tree/nodes/classes/class-node';
import { ClassesNode } from '@src/views/trees/definition-tree/nodes/classes/classes-node';
import { IndividualNode } from '@src/views/trees/definition-tree/nodes/individuals/individual-node';

function makeContext(graphs: string[] = ['urn:g1']): any {
	return {
		graphs,
		getResourceLabel: () => ({ value: 'Label', language: undefined }),
		getResourceTooltip: () => undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
	};
}

function makeClassNode(uri = 'urn:ex#MyClass'): ClassNode {
	const ctx = makeContext();
	return new ClassNode(ctx, `root/<${uri}>`, uri);
}

function makeClassesNode(uri = 'mentor:classes'): ClassesNode {
	const ctx = makeContext();
	return new ClassesNode(ctx, `root/<${uri}>`, uri);
}

beforeEach(() => {
	mockSettingsGet = (k: string, d?: any) => {
		if (k === 'view.showReferences') return true;
		return d;
	};
	mockVocabularyStub = {
		hasIndividuals: vi.fn(() => false),
		hasShapes: vi.fn(() => false),
		hasEquivalentClass: vi.fn(() => false),
		getSubClasses: vi.fn(function*() {}),
		getSubjectsOfType: vi.fn(function*() {}),
		getClasses: vi.fn(function*() {}),
		hasType: vi.fn(() => false),
		getRootClassPath: vi.fn(function*() {}),
	};
});

// ---- ClassNodeBase (via ClassNode) ----

describe('ClassNodeBase (via ClassNode)', () => {
	describe('getIconNameFromClass', () => {
		it('should return "rdf-class" when class has no individuals', () => {
			mockVocabularyStub.hasIndividuals = vi.fn(() => false);
			const node = makeClassNode();
			expect(node.getIconNameFromClass('urn:ex#MyClass')).toBe('rdf-class');
		});

		it('should return "rdf-class-i" when class has individuals', () => {
			mockVocabularyStub.hasIndividuals = vi.fn(() => true);
			const node = makeClassNode();
			expect(node.getIconNameFromClass('urn:ex#MyClass')).toBe('rdf-class-i');
		});

		it('should return "rdf-class" for undefined classIri', () => {
			const node = makeClassNode();
			expect(node.getIconNameFromClass(undefined)).toBe('rdf-class');
		});
	});

	describe('getIconColorFromClass', () => {
		it('should return the same value as getIconColor', () => {
			const node = makeClassNode();
			expect(node.getIconColorFromClass('urn:ex#X')).toEqual(node.getIconColor());
		});
	});

	describe('getIconColor', () => {
		it('should return ThemeColor for mentor.color.class', () => {
			const color = makeClassNode().getIconColor();
			expect(color).toBeInstanceOf(vscode.ThemeColor);
		});
	});

	describe('getIcon', () => {
		it('should return a ThemeIcon', () => {
			mockVocabularyStub.hasIndividuals = vi.fn(() => false);
			const icon = makeClassNode().getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect(icon?.id).toBe('rdf-class');
		});
	});

	describe('getOntologyGraphs', () => {
		it('should return the document graphs', () => {
			const node = makeClassNode();
			expect(node.getOntologyGraphs()).toEqual(['urn:g1']);
		});
	});

	describe('hasChildren', () => {
		it('should return false when there are no sub-classes or individuals', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*() {});
			const node = makeClassNode();
			expect(node.hasChildren()).toBe(false);
		});

		it('should return true when there are sub-classes', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:ex#Sub'; });
			const node = makeClassNode();
			expect(node.hasChildren()).toBe(true);
		});
	});

	describe('getChildren', () => {
		it('should return empty array when no sub-classes or individuals', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*() {});
			const node = makeClassNode();
			expect(node.getChildren()).toEqual([]);
		});

		it('should include sub-class nodes when sub-classes are returned', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:ex#Sub'; });
			const node = makeClassNode();
			const children = node.getChildren();
			expect(children).toHaveLength(1);
			expect(children[0]).toBeInstanceOf(ClassNode);
		});
	});

	describe('getSubClassIris', () => {
		it('should delegate to vocabulary.getSubClasses', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:ex#Sub'; });
			const node = makeClassNode();
			const iris = [...node.getSubClassIris()];
			expect(iris).toEqual(['urn:ex#Sub']);
		});
	});

	describe('getIndividualIris', () => {
		it('should delegate to vocabulary.getSubjectsOfType', () => {
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*() { yield 'urn:ex#Ind'; });
			const node = makeClassNode();
			const iris = [...(node as any).getIndividualIris()];
			expect(iris).toEqual(['urn:ex#Ind']);
		});
	});
});

// ---- ClassNode ----

describe('ClassNode', () => {
	describe('showIndividuals', () => {
		it('should return false (ClassNode hides individuals)', () => {
			expect(makeClassNode().showIndividuals()).toBe(false);
		});
	});

	describe('getContextValue', () => {
		it('should return "resource" when hasShapes is false', () => {
			mockVocabularyStub.hasShapes = vi.fn(() => false);
			expect(makeClassNode().getContextValue()).toBe('resource');
		});

		it('should append " shape-target" when hasShapes is true', () => {
			mockVocabularyStub.hasShapes = vi.fn(() => true);
			expect(makeClassNode().getContextValue()).toBe('resource shape-target');
		});
	});

	describe('getDescription', () => {
		it('should return "≡" appended when hasEquivalentClass is true', () => {
			mockVocabularyStub.hasEquivalentClass = vi.fn(() => true);
			expect(makeClassNode().getDescription()).toBe('≡');
		});

		it('should return empty string when hasEquivalentClass is false', () => {
			mockVocabularyStub.hasEquivalentClass = vi.fn(() => false);
			expect(makeClassNode().getDescription()).toBe('');
		});
	});

	describe('getClassNode', () => {
		it('should return a ClassNode instance', () => {
			const node = makeClassNode();
			const child = node.getClassNode('urn:ex#Sub');
			expect(child).toBeInstanceOf(ClassNode);
		});
	});

	describe('getIndividualNode', () => {
		it('should return an IndividualNode instance', () => {
			const node = makeClassNode();
			const child = node.getIndividualNode('urn:ex#Ind');
			expect(child).toBeInstanceOf(IndividualNode);
		});
	});
});

// ---- ClassesNode ----

describe('ClassesNode', () => {
	describe('getContextValue', () => {
		it('should return "classes"', () => {
			expect(makeClassesNode().getContextValue()).toBe('classes');
		});
	});

	describe('getIcon', () => {
		it('should return undefined', () => {
			expect(makeClassesNode().getIcon()).toBeUndefined();
		});
	});

	describe('getLabel', () => {
		it('should return "Classes"', () => {
			expect(makeClassesNode().getLabel()).toEqual({ label: 'Classes' });
		});
	});

	describe('getTooltip', () => {
		it('should return undefined', () => {
			expect(makeClassesNode().getTooltip()).toBeUndefined();
		});
	});

	describe('getDescription', () => {
		it('should return the count of classes as a string', () => {
			mockVocabularyStub.getClasses = vi.fn(function*() { yield 'urn:ex#A'; yield 'urn:ex#B'; });
			expect(makeClassesNode().getDescription()).toBe('2');
		});

		it('should return "0" when there are no classes', () => {
			mockVocabularyStub.getClasses = vi.fn(function*() {});
			expect(makeClassesNode().getDescription()).toBe('0');
		});
	});

	describe('getSubClassIris', () => {
		it('should return root-level classes (undefined parent)', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:ex#Root'; });
			const iris = [...makeClassesNode().getSubClassIris()];
			expect(iris).toEqual(['urn:ex#Root']);
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when IRI is not a class', () => {
			mockVocabularyStub.hasType = vi.fn(() => false);
			const node = makeClassesNode();
			expect(node.resolveNodeForUri('urn:ex#X')).toBeUndefined();
		});

		it('should walk the hierarchy when IRI is a class', () => {
			mockVocabularyStub.hasType = vi.fn(() => true);
			mockVocabularyStub.getRootClassPath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			const node = makeClassesNode();
			// With an empty path, walkHierarchyPath returns undefined
			const result = node.resolveNodeForUri('urn:ex#X');
			expect(result).toBeUndefined();
		});

		it('should set definedBy to null when includeReferenced is true', () => {
			// When includeReferenced=true, options.definedBy gets set to null
			// We verify it still processes without error and returns undefined for unknown class
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showReferences') return true;  // enables includeReferenced
				return d;
			};
			mockVocabularyStub.hasType = vi.fn(() => true);
			mockVocabularyStub.getRootClassPath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			const result = makeClassesNode().resolveNodeForUri('urn:ex#Ref');
			expect(result).toBeUndefined();
		});

		it('should not set definedBy when includeReferenced is false', () => {
			// Covers the if(options.includeReferenced) FALSE branch
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showReferences') return false; // includeReferenced = false
				return d;
			};
			mockVocabularyStub.hasType = vi.fn(() => true);
			mockVocabularyStub.getRootClassPath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			const result = makeClassesNode().resolveNodeForUri('urn:ex#X');
			expect(result).toBeUndefined();
		});
	});
});

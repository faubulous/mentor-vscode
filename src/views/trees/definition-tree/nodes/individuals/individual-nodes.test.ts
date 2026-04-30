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
import { IndividualNode } from '@src/views/trees/definition-tree/nodes/individuals/individual-node';
import { IndividualClassNode } from '@src/views/trees/definition-tree/nodes/individuals/individual-class-node';
import { IndividualsNode } from '@src/views/trees/definition-tree/nodes/individuals/individuals-node';

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
		if (k === 'view.showIndividualTypes') return true;
		return d;
	};
	mockVocabularyStub = {
		hasIndividuals: vi.fn(() => false),
		getSubClasses: vi.fn(function*() {}),
		getSubjectsOfType: vi.fn(function*() {}),
		getIndividuals: vi.fn(function*() {}),
		getIndividualTypes: vi.fn(function*() {}),
		hasSubjectsOfType: vi.fn(() => false),
	};
});

// ---- IndividualNode ----

describe('IndividualNode', () => {
	describe('getIcon', () => {
		it('should return a ThemeIcon for rdf-individual', () => {
			const icon = makeNode(IndividualNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect(icon?.id).toBe('rdf-individual');
		});
	});

	describe('getIconColor', () => {
		it('should return ThemeColor for mentor.color.individual', () => {
			const color = makeNode(IndividualNode).getIconColor();
			expect(color).toBeInstanceOf(vscode.ThemeColor);
		});
	});
});

// ---- IndividualClassNode ----

describe('IndividualClassNode', () => {
	describe('getChildren', () => {
		it('should return IndividualNode children from vocabulary.getIndividuals', () => {
			mockVocabularyStub.getIndividuals = vi.fn(function*() { yield 'urn:ex#i1'; yield 'urn:ex#i2'; });
			const node = makeNode(IndividualClassNode);
			const children = node.getChildren();
			expect(children).toHaveLength(2);
			expect(children[0]).toBeInstanceOf(IndividualNode);
		});

		it('should return empty array when no individuals are found', () => {
			mockVocabularyStub.getIndividuals = vi.fn(function*() {});
			expect(makeNode(IndividualClassNode).getChildren()).toEqual([]);
		});
	});

	describe('getClassNode', () => {
		it('should return an IndividualClassNode', () => {
			const child = makeNode(IndividualClassNode).getClassNode('urn:ex#sub');
			expect(child).toBeInstanceOf(IndividualClassNode);
		});
	});

	describe('getIndividualNode', () => {
		it('should return an IndividualNode', () => {
			const child = makeNode(IndividualClassNode).getIndividualNode('urn:ex#ind');
			expect(child).toBeInstanceOf(IndividualNode);
		});
	});
});

// ---- IndividualsNode ----

describe('IndividualsNode', () => {
	describe('getContextValue', () => {
		it('should return "individuals"', () => {
			expect(makeNode(IndividualsNode).getContextValue()).toBe('individuals');
		});
	});

	describe('getIcon', () => {
		it('should return undefined', () => {
			expect(makeNode(IndividualsNode).getIcon()).toBeUndefined();
		});
	});

	describe('getLabel', () => {
		it('should return "Individuals"', () => {
			expect(makeNode(IndividualsNode).getLabel()).toEqual({ label: 'Individuals' });
		});
	});

	describe('getTooltip', () => {
		it('should return undefined', () => {
			expect(makeNode(IndividualsNode).getTooltip()).toBeUndefined();
		});
	});

	describe('getDescription', () => {
		it('should return count of individuals as string', () => {
			mockVocabularyStub.getIndividuals = vi.fn(function*() { yield 'urn:ex#i1'; yield 'urn:ex#i2'; yield 'urn:ex#i3'; });
			expect(makeNode(IndividualsNode).getDescription()).toBe('3');
		});
	});

	describe('hasChildren', () => {
		it('should return false when no children', () => {
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() {});
			expect(makeNode(IndividualsNode).hasChildren()).toBe(false);
		});

		it('should return true when there are children', () => {
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield 'urn:ex#Type'; });
			expect(makeNode(IndividualsNode).hasChildren()).toBe(true);
		});
	});

	describe('getChildren (with showIndividualTypes = true)', () => {
		it('should return IndividualClassNode children grouped by type', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showReferences') return true;
				if (k === 'view.showIndividualTypes') return true;
				return d;
			};
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield 'urn:ex#TypeA'; });
			const node = makeNode(IndividualsNode);
			const children = node.getChildren();
			expect(children).toHaveLength(1);
			expect(children[0]).toBeInstanceOf(IndividualClassNode);
		});
	});

	describe('getChildren (with showIndividualTypes = false)', () => {
		it('should return IndividualNode children in flat list', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showReferences') return true;
				if (k === 'view.showIndividualTypes') return false;
				return d;
			};
			mockVocabularyStub.getIndividuals = vi.fn(function*() { yield 'urn:ex#i1'; });
			const node = makeNode(IndividualsNode);
			const children = node.getChildren();
			expect(children).toHaveLength(1);
			expect(children[0]).toBeInstanceOf(IndividualNode);
		});
	});

	describe('resolveNodeForUri (with showIndividualTypes = true)', () => {
		it('should return undefined when individual type node is not found', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showIndividualTypes') return true;
				return d;
			};
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() {});
			expect(makeNode(IndividualsNode).resolveNodeForUri('urn:ex#i')).toBeUndefined();
		});

		it('should return an IndividualNode when both type and individual are found', () => {
			const typeIri = 'urn:ex#TypeA';
			const indIri = 'urn:ex#ind';

			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showIndividualTypes') return true;
				return d;
			};

			// getIndividualTypes called twice:
			// 1. getChildren() builds the type nodes: yields typeIri when 2nd arg is undefined
			// 2. resolveNodeForUri: yields typeIri when 2nd arg is indIri
			mockVocabularyStub.getIndividualTypes = vi.fn(function*(_graphs: any, uri: any) {
				yield typeIri;
			});

			// IndividualClassNode.getChildren() calls getIndividuals(graphs, typeIri, options)
			mockVocabularyStub.getIndividuals = vi.fn(function*() {
				yield indIri;
			});

			const node = makeNode(IndividualsNode);
			const result = node.resolveNodeForUri(indIri);
			expect(result).not.toBeUndefined();
		});

		it('should return undefined when type node exists but individual is not found within it', () => {
			const typeIri = 'urn:ex#TypeA';

			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showIndividualTypes') return true;
				return d;
			};

			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield typeIri; });
			mockVocabularyStub.getIndividuals = vi.fn(function*() {}); // No individuals under type

			const node = makeNode(IndividualsNode);
			const result = node.resolveNodeForUri('urn:ex#missing');
			expect(result).toBeUndefined();
		});

		it('should return undefined when type from resolveNodeForUri is not in children', () => {
			// Covers if(typeNode) FALSE branch: getIndividualTypes for resolveNodeForUri yields
			// a typeIri that is NOT in the children array (different from what getChildren() produces)
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showIndividualTypes') return true;
				return d;
			};
			// getChildren() uses getIndividualTypes(getOntologyGraphs(), undefined)
			// resolveNodeForUri uses getIndividualTypes(getDocumentGraphs(), iri)
			// Make them return DIFFERENT type IRIs so typeNode is not found in children
			let callCount = 0;
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() {
				callCount++;
				if (callCount === 1) {
					yield 'urn:ex#TypeInChildren'; // first call: getChildren()
				} else {
					yield 'urn:ex#TypeNotInChildren'; // second call: resolveNodeForUri
				}
			});
			mockVocabularyStub.getIndividuals = vi.fn(function*() {});

			const node = makeNode(IndividualsNode);
			const result = node.resolveNodeForUri('urn:ex#ind');
			expect(result).toBeUndefined();
		});
	});

	describe('resolveNodeForUri (with showIndividualTypes = false)', () => {
		it('should return undefined when individual is not in flat list', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showIndividualTypes') return false;
				return d;
			};
			mockVocabularyStub.getIndividuals = vi.fn(function*() {});
			expect(makeNode(IndividualsNode).resolveNodeForUri('urn:ex#i')).toBeUndefined();
		});

		it('should return IndividualNode when found in flat list', () => {
			const indIri = 'urn:ex#flat-i';
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showIndividualTypes') return false;
				return d;
			};
			mockVocabularyStub.getIndividuals = vi.fn(function*() { yield indIri; });
			const node = makeNode(IndividualsNode);
			const result = node.resolveNodeForUri(indIri);
			expect(result).not.toBeUndefined();
		});
	});
});

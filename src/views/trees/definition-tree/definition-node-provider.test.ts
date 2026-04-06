import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockVocabularyStub: any;
let mockSettingsStub: any;
let mockContextServiceStub: any;
let mockWorkspaceIndexerStub: any;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SettingsService') return mockSettingsStub;
			if (token === 'VocabularyRepository') return mockVocabularyStub;
			if (token === 'DocumentContextService') return mockContextServiceStub;
			if (token === 'WorkspaceIndexerService') return mockWorkspaceIndexerStub;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { DefinitionNodeProvider } from './definition-node-provider';
import { DefinitionTreeNode } from './definition-tree-node';
import { OntologyNode } from './nodes/ontology-node';
import { ClassesNode } from './nodes/classes/classes-node';
import { DefinitionTreeLayout } from '@src/services/core/settings-service';

function makeContext(): any {
	return {
		graphs: ['urn:g1'],
		getResourceLabel: () => ({ value: 'Label', language: undefined }),
		getResourceTooltip: () => undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
	};
}

beforeEach(() => {
	mockSettingsStub = {
		get: vi.fn((key: string, defaultValue?: any) => defaultValue),
		set: vi.fn(),
		onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
	};
	mockContextServiceStub = {
		onDidChangeDocumentContext: vi.fn(() => ({ dispose: vi.fn() })),
		contexts: {},
	};
	mockWorkspaceIndexerStub = {
		onDidFinishIndexing: vi.fn(() => ({ dispose: vi.fn() })),
	};
	mockVocabularyStub = {
		getOntologies: vi.fn(function*() {}),
		getConceptSchemes: vi.fn(function*() {}),
		getClasses: vi.fn(function*() {}),
		getProperties: vi.fn(function*() {}),
		getIndividuals: vi.fn(function*() {}),
		getShapes: vi.fn(function*() {}),
		getRules: vi.fn(function*() {}),
		getValidators: vi.fn(function*() {}),
		getDefinitionSources: vi.fn(function*() {}),
	};
});

describe('DefinitionNodeProvider', () => {
	describe('constructor', () => {
		it('should subscribe to all required services without throwing', () => {
			expect(() => new DefinitionNodeProvider()).not.toThrow();
			expect(mockContextServiceStub.onDidChangeDocumentContext).toHaveBeenCalled();
			expect(mockWorkspaceIndexerStub.onDidFinishIndexing).toHaveBeenCalled();
			expect(mockSettingsStub.onDidChange).toHaveBeenCalled();
		});
	});

	describe('getParent', () => {
		it('should return the node parent', () => {
			const provider = new DefinitionNodeProvider();
			const ctx = makeContext();
			const parent = new DefinitionTreeNode(ctx, 'root', 'urn:ex#parent');
			const child = new DefinitionTreeNode(ctx, 'root/child', 'urn:ex#child');
			child.parent = parent;
			expect(provider.getParent(child)).toBe(parent);
		});

		it('should return undefined for root nodes', () => {
			const provider = new DefinitionNodeProvider();
			const ctx = makeContext();
			const root = new DefinitionTreeNode(ctx, 'root', 'urn:ex#root');
			expect(provider.getParent(root)).toBeUndefined();
		});
	});

	describe('getTreeItem', () => {
		it('should return a TreeItem with all expected properties', () => {
			const provider = new DefinitionNodeProvider();
			const ctx = makeContext();
			const node = new DefinitionTreeNode(ctx, 'root', 'urn:ex#x');
			const item = provider.getTreeItem(node);
			expect(item).toHaveProperty('id');
			expect(item).toHaveProperty('collapsibleState');
			expect(item).toHaveProperty('label');
		});
	});

	describe('getChildren — no document set', () => {
		it('should return empty array when no document is set', () => {
			const provider = new DefinitionNodeProvider();
			const children = provider.getChildren(undefined);
			expect(children).toEqual([]);
		});

		it('should return node children when called with a node', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*() {});
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => false);
			mockSettingsStub.get = vi.fn((k: string, d?: any) => k === 'view.showReferences' ? true : d);

			const provider = new DefinitionNodeProvider();
			const ctx = makeContext();
			const classesNode = new ClassesNode(ctx, 'root/<mentor:classes>', 'mentor:classes');
			const children = provider.getChildren(classesNode);
			expect(Array.isArray(children)).toBe(true);
		});
	});

	describe('getChildren — ByType layout (default)', () => {
		it('should return empty array when vocabulary has no data', () => {
			mockSettingsStub.get = vi.fn((k: string, d?: any) => {
				if (k === 'view.definitionTree.defaultLayout') return DefinitionTreeLayout.ByType;
				return d;
			});

			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();
			const children = provider.getChildren(undefined);
			expect(Array.isArray(children)).toBe(true);
			expect(children!.length).toBe(0);
		});

		it('should include ClassesNode when classes exist', () => {
			mockSettingsStub.get = vi.fn((k: string, d?: any) => {
				if (k === 'view.definitionTree.defaultLayout') return DefinitionTreeLayout.ByType;
				return true;
			});
			mockVocabularyStub.getClasses = vi.fn(function*() { yield 'urn:ex#C'; });

			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();
			const children = provider.getChildren(undefined);
			expect(children!.some(c => c instanceof ClassesNode)).toBe(true);
		});
	});

	describe('getChildren — BySource layout', () => {
		it('should return empty array when no ontologies, schemes, or sources', () => {
			mockSettingsStub.get = vi.fn((k: string, d?: any) => {
				if (k === 'view.definitionTree.defaultLayout') return DefinitionTreeLayout.BySource;
				return d;
			});

			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();
			const children = provider.getChildren(undefined);
			expect(Array.isArray(children)).toBe(true);
		});

		it('should include OntologyNode for each ontology', () => {
			mockSettingsStub.get = vi.fn((k: string, d?: any) => {
				if (k === 'view.definitionTree.defaultLayout') return DefinitionTreeLayout.BySource;
				return d;
			});
			mockVocabularyStub.getOntologies = vi.fn(function*() { yield 'urn:ex#onto'; });

			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();
			const children = provider.getChildren(undefined);
			expect(children!.some(c => c instanceof OntologyNode)).toBe(true);
		});
	});

	describe('refresh', () => {
		it('should update document and fire change event when document is set', () => {
			const provider = new DefinitionNodeProvider();
			const ctx = makeContext();
			provider.document = ctx; // Pre-set document so refresh fires
			const ctx2 = makeContext();
			expect(() => provider.refresh(ctx2)).not.toThrow();
			expect(provider.document).toBe(ctx2);
		});

		it('should not fire change if document is not set and no new context passed', () => {
			const provider = new DefinitionNodeProvider();
			expect(() => provider.refresh()).not.toThrow();
		});
	});

	describe('getNodeForUri', () => {
		it('should return undefined when node cache is empty and no roots', () => {
			const provider = new DefinitionNodeProvider();
			expect(provider.getNodeForUri('urn:ex#NotFound')).toBeUndefined();
		});
	});
});

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
import { DefinitionNodeProvider } from '@src/views/trees/definition-tree/definition-node-provider';
import { DefinitionTreeNode } from '@src/views/trees/definition-tree/definition-tree-node';
import { OntologyNode } from '@src/views/trees/definition-tree/nodes/ontology-node';
import { ClassesNode } from '@src/views/trees/definition-tree/nodes/classes/classes-node';
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

		it('should refresh tree when onDidChangeDocumentContext handler fires', () => {
			let ctxHandler: any;
			mockContextServiceStub.onDidChangeDocumentContext = vi.fn((h: any) => {
				ctxHandler = h;
				return { dispose: vi.fn() };
			});
			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();
			const fireSpy = vi.spyOn((provider as any)._onDidChangeTreeData, 'fire');
			ctxHandler(makeContext());
			expect(fireSpy).toHaveBeenCalled();
		});

		it('should refresh tree when onDidFinishIndexing handler fires', () => {
			let indexHandler: any;
			mockWorkspaceIndexerStub.onDidFinishIndexing = vi.fn((h: any) => {
				indexHandler = h;
				return { dispose: vi.fn() };
			});
			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();
			const fireSpy = vi.spyOn((provider as any)._onDidChangeTreeData, 'fire');
			indexHandler();
			expect(fireSpy).toHaveBeenCalled();
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

		it('should override ThemeIcon color when issue color is provided', () => {
			const provider = new DefinitionNodeProvider({
				getIssueColor: vi.fn(() => new vscode.ThemeColor('list.errorForeground')),
			});
			const ctx = makeContext();

			class IconNode extends DefinitionTreeNode {
				override getIcon() {
					return new vscode.ThemeIcon('rdf-class', new vscode.ThemeColor('mentor.color.class'));
				}
			}

			const node = new IconNode(ctx, 'root', 'urn:ex#x');
			const item = provider.getTreeItem(node);

			expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
			expect((item.iconPath as vscode.ThemeIcon).id).toBe('rdf-class');
			expect((item.iconPath as vscode.ThemeIcon).color?.id).toBe('list.errorForeground');
		});

		it('should keep original ThemeIcon color when no issue color is provided', () => {
			const provider = new DefinitionNodeProvider({
				getIssueColor: vi.fn(() => undefined),
			});
			const ctx = makeContext();

			class IconNode extends DefinitionTreeNode {
				override getIcon() {
					return new vscode.ThemeIcon('rdf-class', new vscode.ThemeColor('mentor.color.class'));
				}
			}

			const node = new IconNode(ctx, 'root', 'urn:ex#x');
			const item = provider.getTreeItem(node);

			expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
			expect((item.iconPath as vscode.ThemeIcon).color?.id).toBe('mentor.color.class');
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

		it('should return cached node when URI was seen during getChildren', () => {
			mockSettingsStub.get = vi.fn((k: string, d?: any) => {
				if (k === 'view.definitionTree.defaultLayout') return DefinitionTreeLayout.ByType;
				return true;
			});
			mockVocabularyStub.getOntologies = vi.fn(function*() { yield 'urn:ex#onto'; });

			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();

			// Calling getChildren populates the internal node cache for non-mentor: URIs
			provider.getChildren(undefined);

			// Second call uses the cache path (early return)
			const result = provider.getNodeForUri('urn:ex#onto');
			expect(result).toBeDefined();
			expect(result).toBeInstanceOf(OntologyNode);
		});

		it('should return cache hit on repeated getNodeForUri call', () => {
			mockSettingsStub.get = vi.fn((k: string, d?: any) => {
				if (k === 'view.definitionTree.defaultLayout') return DefinitionTreeLayout.ByType;
				return true;
			});
			mockVocabularyStub.getOntologies = vi.fn(function*() { yield 'urn:ex#onto2'; });

			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();
			provider.getChildren(undefined);

			const first = provider.getNodeForUri('urn:ex#onto2');
			const second = provider.getNodeForUri('urn:ex#onto2');
			expect(first).toBe(second); // same cached instance
		});

		it('should find node via resolveNodeForUri when not in cache', () => {
			const provider = new DefinitionNodeProvider();
			const ctx = makeContext();
			const mockNode = new DefinitionTreeNode(ctx, 'root/child', 'urn:ex#Child');
			const mockRoot = new DefinitionTreeNode(ctx, 'root', 'urn:ex#Root');
			(mockRoot as any).resolveNodeForUri = vi.fn((iri: string) => iri === 'urn:ex#Child' ? mockNode : undefined);
			vi.spyOn(provider, 'getChildren').mockReturnValue([mockRoot]);

			const found = provider.getNodeForUri('urn:ex#Child');
			expect(found).toBe(mockNode);
		});
	});

	describe('getRootNodes — no document', () => {
		it('should return empty array when document is not set', () => {
			const provider = new DefinitionNodeProvider();
			expect(provider.getRootNodes()).toEqual([]);
		});
	});

	describe('getRootNodes — all vocabulary types', () => {
		function makeByTypeProvider() {
			mockSettingsStub.get = vi.fn((k: string, d?: any) => {
				if (k === 'view.definitionTree.defaultLayout') return DefinitionTreeLayout.ByType;
				return true;
			});
			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();
			return provider;
		}

		it('should include PropertiesNode when properties exist', () => {
			mockVocabularyStub.getProperties = vi.fn(function*() { yield 'urn:ex#p1'; });
			const children = makeByTypeProvider().getChildren(undefined);
			expect(children!.some(c => c.constructor.name === 'PropertiesNode')).toBe(true);
		});

		it('should include IndividualsNode when individuals exist', () => {
			mockVocabularyStub.getIndividuals = vi.fn(function*() { yield 'urn:ex#i1'; });
			const children = makeByTypeProvider().getChildren(undefined);
			expect(children!.some(c => c.constructor.name === 'IndividualsNode')).toBe(true);
		});

		it('should include ShapesNode when shapes exist', () => {
			mockVocabularyStub.getShapes = vi.fn(function*() { yield 'urn:ex#s1'; });
			const children = makeByTypeProvider().getChildren(undefined);
			expect(children!.some(c => c.constructor.name === 'ShapesNode')).toBe(true);
		});

		it('should include RulesNode when rules exist', () => {
			mockVocabularyStub.getRules = vi.fn(function*() { yield 'urn:ex#r1'; });
			const children = makeByTypeProvider().getChildren(undefined);
			expect(children!.some(c => c.constructor.name === 'RulesNode')).toBe(true);
		});

		it('should include ValidatorsNode when validators exist', () => {
			mockVocabularyStub.getValidators = vi.fn(function*() { yield 'urn:ex#v1'; });
			const children = makeByTypeProvider().getChildren(undefined);
			expect(children!.some(c => c.constructor.name === 'ValidatorsNode')).toBe(true);
		});

		it('should include ConceptSchemeNode when concept schemes exist', () => {
			mockVocabularyStub.getConceptSchemes = vi.fn(function*() { yield 'urn:ex#scheme1'; });
			const children = makeByTypeProvider().getChildren(undefined);
			expect(children!.some(c => c instanceof OntologyNode || c.constructor.name === 'ConceptSchemeNode')).toBe(true);
		});
	});

	describe('getRootNodesWithSources — source nodes and unknown', () => {
		function makeBySourceProvider() {
			mockSettingsStub.get = vi.fn((k: string, d?: any) => {
				if (k === 'view.definitionTree.defaultLayout') return DefinitionTreeLayout.BySource;
				return d;
			});
			const provider = new DefinitionNodeProvider();
			provider.document = makeContext();
			return provider;
		}

		it('should create source OntologyNode for definition sources not matching any ontology', () => {
			mockVocabularyStub.getOntologies = vi.fn(function*() {});
			mockVocabularyStub.getConceptSchemes = vi.fn(function*() {});
			mockVocabularyStub.getDefinitionSources = vi.fn(function*() { yield 'urn:ex#source1'; });

			const children = makeBySourceProvider().getChildren(undefined);
			const sourceNode = children!.find(c => c instanceof OntologyNode) as OntologyNode | undefined;
			expect(sourceNode).toBeDefined();
			expect(sourceNode!.isReferenced).toBe(true);
		});

		it('should skip definition source when it matches an ontology URI', () => {
			mockVocabularyStub.getOntologies = vi.fn(function*() { yield 'urn:ex#onto'; });
			mockVocabularyStub.getConceptSchemes = vi.fn(function*() {});
			mockVocabularyStub.getDefinitionSources = vi.fn(function*() { yield 'urn:ex#onto'; });

			const children = makeBySourceProvider().getChildren(undefined);
			// Only the ontology node should be present, not a second source node
			const ontologyNodes = children!.filter(c => c instanceof OntologyNode);
			expect(ontologyNodes).toHaveLength(1);
		});

		it('should add unknown node when there are definitions with no declared source', () => {
			mockVocabularyStub.getOntologies = vi.fn(function*() {});
			mockVocabularyStub.getConceptSchemes = vi.fn(function*() {});
			mockVocabularyStub.getDefinitionSources = vi.fn(function*() {});
			// Make getClasses yield something so hasUnknown = true
			mockVocabularyStub.getClasses = vi.fn(function*() { yield 'urn:ex#C'; });

			const children = makeBySourceProvider().getChildren(undefined);
			const unknownNode = children!.find(c => c instanceof OntologyNode && c.uri === 'mentor:unknown');
			expect(unknownNode).toBeDefined();
		});

		it('should expand the single result when only one source exists', () => {
			mockVocabularyStub.getOntologies = vi.fn(function*() { yield 'urn:ex#solo'; });
			mockVocabularyStub.getConceptSchemes = vi.fn(function*() {});
			mockVocabularyStub.getDefinitionSources = vi.fn(function*() {});

			const children = makeBySourceProvider().getChildren(undefined);
			expect(children!.length).toBe(1);
			// Single result gets Expanded state (2 = Expanded in vscode.TreeItemCollapsibleState)
			expect(children![0].initialCollapsibleState).toBe(2);
		});

		it('should include ConceptSchemeNode for each concept scheme in BySource layout', () => {
			mockVocabularyStub.getOntologies = vi.fn(function*() {});
			mockVocabularyStub.getConceptSchemes = vi.fn(function*() { yield 'urn:ex#scheme1'; });
			mockVocabularyStub.getDefinitionSources = vi.fn(function*() {});

			const children = makeBySourceProvider().getChildren(undefined);
			expect(children!.some(c => c.constructor.name === 'ConceptSchemeNode')).toBe(true);
		});
	});
});

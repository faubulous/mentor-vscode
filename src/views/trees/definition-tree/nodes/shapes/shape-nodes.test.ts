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
import { DefinitionTreeNode } from '@src/views/trees/definition-tree/definition-tree-node';
import { NodeShapeNode, PropertyShapeNode, ParameterNode } from '@src/views/trees/definition-tree/nodes/shapes/shape-node';
import { ShapeClassNode } from '@src/views/trees/definition-tree/nodes/shapes/shape-class-node';
import { ShapesNode } from '@src/views/trees/definition-tree/nodes/shapes/shapes-node';

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
		hasSubjectsOfType: vi.fn(() => false),
		getShapeTargets: vi.fn(function*() {}),
		getShapes: vi.fn(function*() {}),
		hasType: vi.fn(() => false),
		getRootShapePath: vi.fn(function*() {}),
		getIndividualTypes: vi.fn(function*() {}),
		getRange: vi.fn(() => undefined),
		getDatatype: vi.fn(() => undefined),
		hasShapes: vi.fn(() => false),
	};
});

// ---- ParameterNode ----

describe('ParameterNode', () => {
	describe('getIcon', () => {
		it('should return ThemeIcon with "mention"', () => {
			const icon = makeNode(ParameterNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect((icon as any).id).toBe('mention');
		});
	});

	describe('getIconColor', () => {
		it('should return ThemeColor mentor.color.class', () => {
			const color = makeNode(ParameterNode).getIconColor();
			expect(color).toBeInstanceOf(vscode.ThemeColor);
			expect((color as any).id).toBe('mentor.color.class');
		});
	});
});

// ---- NodeShapeNode ----

describe('NodeShapeNode', () => {
	describe('getIcon', () => {
		it('should return ThemeIcon when no shape target exists', () => {
			const icon = makeNode(NodeShapeNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
		});

		it('should return ThemeIcon based on shape target class', () => {
			mockVocabularyStub.getShapeTargets = vi.fn(function*() { yield 'urn:ex#TargetClass'; });
			mockVocabularyStub.hasIndividuals = vi.fn(() => true);
			const icon = makeNode(NodeShapeNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
		});
	});

	describe('getChildren', () => {
		it('should return empty array', () => {
			expect(makeNode(NodeShapeNode).getChildren()).toEqual([]);
		});
	});

	describe('getClassNode', () => {
		it('should return a DefinitionTreeNode', () => {
			expect(makeNode(NodeShapeNode).getClassNode('urn:ex#c')).toBeInstanceOf(DefinitionTreeNode);
		});
	});

	describe('getIndividualNode', () => {
		it('should return a DefinitionTreeNode', () => {
			expect(makeNode(NodeShapeNode).getIndividualNode('urn:ex#i')).toBeInstanceOf(DefinitionTreeNode);
		});
	});
});

// ---- PropertyShapeNode ----

describe('PropertyShapeNode', () => {
	describe('getIcon', () => {
		it('should return ThemeIcon when no shape target', () => {
			mockVocabularyStub.getShapeTargets = vi.fn(function*() {});
			const icon = makeNode(PropertyShapeNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
		});

		it('should return ThemeIcon based on range of shape target', () => {
			mockVocabularyStub.getShapeTargets = vi.fn(function*() { yield 'urn:ex#target'; });
			mockVocabularyStub.getRange = vi.fn(() => 'http://www.w3.org/2001/XMLSchema#string');
			const icon = makeNode(PropertyShapeNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
		});
	});

	describe('getChildren', () => {
		it('should return empty array', () => {
			expect(makeNode(PropertyShapeNode).getChildren()).toEqual([]);
		});
	});
});

// ---- ShapeClassNode ----

describe('ShapeClassNode', () => {
	describe('getOntologyGraphs', () => {
		it('should include _SH and document graphs', () => {
			const graphs = makeNode(ShapeClassNode).getOntologyGraphs();
			expect(graphs).toContain('urn:g1');
			expect(graphs.length).toBeGreaterThan(1);
		});
	});

	describe('getSubClassIris', () => {
		it('should yield nothing when vocabulary returns no sub-classes', () => {
			const iris = [...makeNode(ShapeClassNode).getSubClassIris()];
			expect(iris).toEqual([]);
		});

		it('should yield class IRI when vocabulary returns matching sub-class', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:ex#SubShape'; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => true);
			const iris = [...makeNode(ShapeClassNode).getSubClassIris()];
			expect(iris).toContain('urn:ex#SubShape');
		});

		it('should not yield class IRI when hasSubjectsOfType returns false', () => {
			// Covers the if(hasSubjectsOfType) FALSE branch at line 18
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:ex#SubShape'; });
			// hasSubjectsOfType defaults to () => false from beforeEach
			const iris = [...makeNode(ShapeClassNode).getSubClassIris()];
			expect(iris).toEqual([]);
		});
	});

	describe('getClassNode', () => {
		it('should return a ShapeClassNode', () => {
			expect(makeNode(ShapeClassNode).getClassNode('urn:ex#c')).toBeInstanceOf(ShapeClassNode);
		});
	});

	describe('getIndividualNode — ParameterNode', () => {
		it('should return ParameterNode when type is sh:Parameter', () => {
			const { SH } = require('@faubulous/mentor-rdf');
			mockVocabularyStub.hasType = vi.fn((_g: any, _iri: any, type: any) => type === SH.Parameter);
			const node = makeNode(ShapeClassNode).getIndividualNode('urn:ex#p');
			expect(node).toBeInstanceOf(ParameterNode);
		});
	});

	describe('getIndividualNode — PropertyShapeNode', () => {
		it('should return PropertyShapeNode when type is sh:PropertyShape', () => {
			const { SH } = require('@faubulous/mentor-rdf');
			mockVocabularyStub.hasType = vi.fn((_g: any, _iri: any, type: any) => type === SH.PropertyShape);
			const node = makeNode(ShapeClassNode).getIndividualNode('urn:ex#ps');
			expect(node).toBeInstanceOf(PropertyShapeNode);
		});
	});

	describe('getIndividualNode — NodeShapeNode', () => {
		it('should return NodeShapeNode by default', () => {
			mockVocabularyStub.hasType = vi.fn(() => false);
			const node = makeNode(ShapeClassNode).getIndividualNode('urn:ex#ns');
			expect(node).toBeInstanceOf(NodeShapeNode);
		});
	});
});

// ---- ShapesNode ----

describe('ShapesNode', () => {
	describe('getContextValue', () => {
		it('should return "shapes"', () => {
			expect(makeNode(ShapesNode).getContextValue()).toBe('shapes');
		});
	});

	describe('getIcon', () => {
		it('should return undefined', () => {
			expect(makeNode(ShapesNode).getIcon()).toBeUndefined();
		});
	});

	describe('getLabel', () => {
		it('should return "Shapes"', () => {
			expect(makeNode(ShapesNode).getLabel()).toEqual({ label: 'Shapes' });
		});
	});

	describe('getTooltip', () => {
		it('should return undefined', () => {
			expect(makeNode(ShapesNode).getTooltip()).toBeUndefined();
		});
	});

	describe('getDescription', () => {
		it('should return count of shapes', () => {
			mockVocabularyStub.getShapes = vi.fn(function*() { yield 'urn:ex#S1'; yield 'urn:ex#S2'; });
			expect(makeNode(ShapesNode).getDescription()).toBe('2');
		});
	});

	describe('resolveNodeForUri — not a shape', () => {
		it('should return undefined when IRI is not a shape', () => {
			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() {});
			expect(makeNode(ShapesNode).resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});
	});

	describe('resolveNodeForUri — is a shape class', () => {
		it('should return undefined when hierarchy path is empty', () => {
			const { SH } = require('@faubulous/mentor-rdf');
			mockVocabularyStub.hasType = vi.fn((_g: any, _iri: any, type: any) => type === SH.Shape);
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			expect(makeNode(ShapesNode).resolveNodeForUri('urn:ex#S')).toBeUndefined();
		});
	});

	describe('resolveNodeForUri — is an individual shape', () => {
		it('should return undefined when individual has no type with path', () => {
			const { SH } = require('@faubulous/mentor-rdf');
			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield 'urn:ex#T'; });
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			expect(makeNode(ShapesNode).resolveNodeForUri('urn:ex#i')).toBeUndefined();
		});

		it('should return shape instance when typeNode exists and contains the individual', () => {
			const typeIri = 'urn:ex#ShapeClass';
			const shapeIri = 'urn:ex#shapeInst';

			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield typeIri; });
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {}); // empty path → rootToType = [typeIri]
			// Use unconditional mock so the 'mentor:shapes' URI always yields typeIri
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield typeIri; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn((_g: any, uri: any) => uri === typeIri);
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*(_g: any, uri: any) {
				if (uri === typeIri) yield shapeIri;
			});

			// Use 'mentor:shapes' so the root ShapesNode uses SH.Shape in getSubClassIris
			const result = makeNode(ShapesNode, 'mentor:shapes').resolveNodeForUri(shapeIri);
			expect(result).not.toBeUndefined();
			expect(result!.uri).toBe(shapeIri);
		});

		it('should return undefined when typeNode found but target instance not in its children', () => {
			// Covers if(found) FALSE branch: typeNode exists but instances don't contain the target
			const typeIri = 'urn:ex#ShapeClass';
			const searchIri = 'urn:ex#notFound';

			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield typeIri; });
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield typeIri; }); // typeNode found
			mockVocabularyStub.hasSubjectsOfType = vi.fn((_g: any, uri: any) => uri === typeIri);
			// instances don't contain searchIri
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*(_g: any, uri: any) {
				if (uri === typeIri) yield 'urn:ex#otherShape';
			});

			const result = makeNode(ShapesNode, 'mentor:shapes').resolveNodeForUri(searchIri);
			expect(result).toBeUndefined();
		});
	});
});

// ---- ClassNodeBase (showIndividuals = true path) via ShapeClassNode ----

describe('ClassNodeBase via ShapeClassNode (showIndividuals = true)', () => {
	describe('hasChildren', () => {
		it('should return true via individual path when no sub-classes but individuals exist', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*() { yield 'urn:ex#shape1'; });
			expect(makeNode(ShapeClassNode).hasChildren()).toBe(true);
		});

		it('should return false when showIndividuals=true but no sub-classes and no individuals', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*() {});
			expect(makeNode(ShapeClassNode).hasChildren()).toBe(false);
		});
	});

	describe('getChildren', () => {
		it('should include individual nodes when getSubjectsOfType yields IRIs', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*() { yield 'urn:ex#ns1'; });
			mockVocabularyStub.hasType = vi.fn(() => false);
			const children = makeNode(ShapeClassNode).getChildren();
			expect(children.some(c => c instanceof NodeShapeNode)).toBe(true);
		});
	});
});

// ---- ShapeClassNode with notDefinedBy options (line 18 coverage) ----

describe('ShapeClassNode.getSubClassIris with pre-populated notDefinedBy', () => {
	it('should add _SH to an existing notDefinedBy set', () => {
		const { _SH } = require('@faubulous/mentor-rdf');
		mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:ex#SubShape'; });
		mockVocabularyStub.hasSubjectsOfType = vi.fn(() => true);
		const ctx = makeContext();
		const node = new ShapeClassNode(ctx, 'root/<urn:ex#x>', 'urn:ex#x', { notDefinedBy: new Set(['urn:ex#existing']) });
		const iris = [...node.getSubClassIris()];
		expect(iris).toContain('urn:ex#SubShape');
	});
});

// ---- Blank node URI for NodeShapeNode and PropertyShapeNode ----

describe('NodeShapeNode.getIcon with blank node URI', () => {
	it('should use BlankNode when URI contains no colon', () => {
		const ctx = makeContext();
		const node = new NodeShapeNode(ctx, 'root/<blank>', 'blank_node_without_colon');
		mockVocabularyStub.getShapeTargets = vi.fn(function*() {});
		const icon = node.getIcon();
		expect(icon).toBeInstanceOf(vscode.ThemeIcon);
	});

	it('should use BlankNode with target and resolve class icon', () => {
		const ctx = makeContext();
		const node = new NodeShapeNode(ctx, 'root/<blank>', 'blank_node_without_colon');
		mockVocabularyStub.getShapeTargets = vi.fn(function*() { yield 'urn:ex#TargetClass'; });
		mockVocabularyStub.hasIndividuals = vi.fn(() => false);
		const icon = node.getIcon();
		expect(icon).toBeInstanceOf(vscode.ThemeIcon);
	});
});

describe('PropertyShapeNode.getIcon with blank node URI', () => {
	it('should use BlankNode when URI contains no colon', () => {
		const ctx = makeContext();
		const node = new PropertyShapeNode(ctx, 'root/<blank>', 'blank_node_without_colon');
		mockVocabularyStub.getShapeTargets = vi.fn(function*() {});
		const icon = node.getIcon();
		expect(icon).toBeInstanceOf(vscode.ThemeIcon);
	});

	it('should use BlankNode with target and resolve property range icon', () => {
		const ctx = makeContext();
		const node = new PropertyShapeNode(ctx, 'root/<blank>', 'blank_node_without_colon');
		mockVocabularyStub.getShapeTargets = vi.fn(function*() { yield 'urn:ex#target'; });
		mockVocabularyStub.getRange = vi.fn(() => 'http://www.w3.org/2001/XMLSchema#string');
		const icon = node.getIcon();
		expect(icon).toBeInstanceOf(vscode.ThemeIcon);
	});
});

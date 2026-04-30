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
import { ClassesNode } from '@src/views/trees/definition-tree/nodes/classes/classes-node';
import { PropertiesNode } from '@src/views/trees/definition-tree/nodes/properties/properties-node';
import { IndividualsNode } from '@src/views/trees/definition-tree/nodes/individuals/individuals-node';
import { ShapesNode } from '@src/views/trees/definition-tree/nodes/shapes/shapes-node';
import { RulesNode } from '@src/views/trees/definition-tree/nodes/rules/rules-node';
import { ValidatorsNode } from '@src/views/trees/definition-tree/nodes/validators/validators-node';
import { OntologyNode } from '@src/views/trees/definition-tree/nodes/ontology-node';

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

// Shorthand for OntologyNode
function makeOntologyNode(uri = 'urn:ex#onto') {
	return makeNode(OntologyNode, uri);
}

beforeEach(() => {
	mockSettingsGet = (k: string, d?: any) => {
		if (k === 'view.showReferences') return true;
		if (k === 'view.showPropertyTypes') return true;
		if (k === 'view.showIndividualTypes') return true;
		return d;
	};
	mockVocabularyStub = {
		// ClassesNode / class-related
		hasIndividuals: vi.fn(() => false),
		getSubClasses: vi.fn(function*() {}),
		getSubjectsOfType: vi.fn(function*() {}),
		hasSubjectsOfType: vi.fn(() => false),
		// PropertiesNode
		getPropertyTypes: vi.fn(function*() {}),
		getProperties: vi.fn(function*() {}),
		getSubProperties: vi.fn(function*() {}),
		getRootPropertiesOfType: vi.fn(function*() {}),
		getRootPropertiesPath: vi.fn(function*() {}),
		// IndividualsNode
		getIndividualTypes: vi.fn(function*() {}),
		getIndividuals: vi.fn(function*() {}),
		// ShapesNode
		getShapes: vi.fn(function*() {}),
		getShapeTargets: vi.fn(function*() {}),
		getRootShapePath: vi.fn(function*() {}),
		hasShapes: vi.fn(() => false),
		// RulesNode / ValidatorsNode
		getRules: vi.fn(function*() {}),
		getValidators: vi.fn(function*() {}),
		// OntologyNode
		getOntologyVersionInfo: vi.fn(() => undefined),
		// Common
		hasType: vi.fn(() => false),
		getRange: vi.fn(() => undefined),
		getDatatype: vi.fn(() => undefined),
	};
});

// ---- OntologyNode ----

describe('OntologyNode', () => {
	describe('getLabel', () => {
		it('should return "Unknown" for mentor:unknown', () => {
			const node = makeOntologyNode('mentor:unknown');
			expect(node.getLabel()).toEqual({ label: 'Unknown' });
		});

		it('should return label from context for normal IRIs', () => {
			const label = makeOntologyNode().getLabel();
			expect(label).toBeDefined();
		});
	});

	describe('getIcon', () => {
		it('should return ThemeIcon with "rdf-ontology"', () => {
			const icon = makeOntologyNode().getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect((icon as any).id).toBe('rdf-ontology');
		});
	});

	describe('getIconColor', () => {
		it('should return ThemeColor mentor.color.class', () => {
			const color = makeOntologyNode().getIconColor();
			expect(color).toBeInstanceOf(vscode.ThemeColor);
			expect((color as any).id).toBe('mentor.color.class');
		});
	});

	describe('getDescription', () => {
		it('should return base description when no version info', () => {
			mockVocabularyStub.getOntologyVersionInfo = vi.fn(() => undefined);
			expect(typeof makeOntologyNode().getDescription()).toBe('string');
		});

		it('should include version info when available', () => {
			mockVocabularyStub.getOntologyVersionInfo = vi.fn(() => '1.0.0');
			const desc = makeOntologyNode().getDescription();
			expect(desc).toContain('1.0.0');
		});

                it('should return base description when uri is empty string', () => {
                        // Covers the if(this.uri) FALSE branch at line 43
                        mockVocabularyStub.getOntologyVersionInfo = vi.fn(() => '1.0.0');
                        const desc = makeOntologyNode('').getDescription();
                        expect(typeof desc).toBe('string');
                        expect(desc).not.toContain('1.0.0');
                });
        });

	describe('getTooltip', () => {
		it('should return MarkdownString for mentor:unknown', () => {
			const tooltip = makeOntologyNode('mentor:unknown').getTooltip();
			expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
		});

		it('should return default tooltip for normal IRI', () => {
			// super.getTooltip() returns undefined when context provides no tooltip
			expect(makeOntologyNode().getTooltip()).toBeUndefined();
		});
	});

	describe('getChildren', () => {
		it('should return empty array when all child nodes have no children', () => {
			const children = makeOntologyNode().getChildren();
			expect(children).toEqual([]);
		});

		it('should include ClassesNode when classes exist', () => {
			// Make ClassesNode.hasChildren() return true
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:ex#C'; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => true);
			const children = makeOntologyNode().getChildren();
			const hasClasses = children.some(c => c instanceof ClassesNode);
			expect(hasClasses).toBe(true);
		});

		it('should include PropertiesNode when properties exist', () => {
			mockVocabularyStub.getPropertyTypes = vi.fn(function*() { yield 'urn:ex#T'; });
			const children = makeOntologyNode().getChildren();
			const hasProps = children.some(c => c instanceof PropertiesNode);
			expect(hasProps).toBe(true);
		});

		it('should include IndividualsNode when individuals exist', () => {
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield 'urn:ex#T'; });
			const children = makeOntologyNode().getChildren();
			expect(children.some(c => c instanceof IndividualsNode)).toBe(true);
		});

		it('should include ShapesNode when shapes exist', () => {
			const { SH } = require('@faubulous/mentor-rdf');
			mockVocabularyStub.getSubClasses = vi.fn(function*(g: any, uri: any) {
				if (uri === SH.Shape) yield 'urn:ex#S';
			});
			mockVocabularyStub.hasSubjectsOfType = vi.fn((_g: any, uri: any) => uri === 'urn:ex#S');
			const children = makeOntologyNode().getChildren();
			expect(children.some(c => c instanceof ShapesNode)).toBe(true);
		});

		it('should include RulesNode when rules exist', () => {
			const { SH } = require('@faubulous/mentor-rdf');
			mockVocabularyStub.getSubClasses = vi.fn(function*(g: any, uri: any) {
				if (uri === SH.Rule) yield 'urn:ex#R';
			});
			mockVocabularyStub.hasSubjectsOfType = vi.fn((_g: any, uri: any) => uri === 'urn:ex#R');
			const children = makeOntologyNode().getChildren();
			expect(children.some(c => c instanceof RulesNode)).toBe(true);
		});

		it('should include ValidatorsNode when validators exist', () => {
			const { SH } = require('@faubulous/mentor-rdf');
			mockVocabularyStub.getSubClasses = vi.fn(function*(g: any, uri: any) {
				if (uri === SH.Validator) yield 'urn:ex#V';
			});
			mockVocabularyStub.hasSubjectsOfType = vi.fn((_g: any, uri: any) => uri === 'urn:ex#V');
			const children = makeOntologyNode().getChildren();
			expect(children.some(c => c instanceof ValidatorsNode)).toBe(true);
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when no children have the URI', () => {
			expect(makeOntologyNode().resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});

		it('should return undefined when children exist but none resolves the URI', () => {
			// Covers the if(found) FALSE branch: loop runs but resolveNodeForUri returns undefined
			// Include ClassesNode (getSubClasses yields something) but hasType=false → ClassesNode.resolveNodeForUri returns undefined
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:ex#C1'; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => true);
			mockVocabularyStub.hasType = vi.fn(() => false);
			const found = makeOntologyNode().resolveNodeForUri('urn:ex#nonexistent');
			expect(found).toBeUndefined();
		});

		it('should return found node when a child resolves the URI', () => {
			// Set up ClassesNode child to resolve a class IRI
			const classIri = 'urn:ex#C1';
			const { RDFS } = require('@faubulous/mentor-rdf');
			mockVocabularyStub.getClasses = vi.fn(function*() { yield classIri; });
			mockVocabularyStub.hasType = vi.fn((_g: any, _iri: any, type: any) => type === RDFS.Class);
			mockVocabularyStub.getRootClassPath = vi.fn(function*() {}); // empty → rootToNode = [classIri]
			// ClassesNode.getSubClassIris() via ClassNodeBase builds ClassNode(classIri)
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield classIri; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => true);

			const found = makeOntologyNode().resolveNodeForUri(classIri);
			expect(found).not.toBeUndefined();
			expect(found!.uri).toBe(classIri);
		});
	});
});

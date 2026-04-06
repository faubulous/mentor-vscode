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
import { ClassesNode } from './classes/classes-node';
import { PropertiesNode } from './properties/properties-node';
import { IndividualsNode } from './individuals/individuals-node';
import { ShapesNode } from './shapes/shapes-node';
import { RulesNode } from './rules/rules-node';
import { ValidatorsNode } from './validators/validators-node';
import { OntologyNode } from './ontology-node';

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
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when no children have the URI', () => {
			expect(makeOntologyNode().resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});
	});
});

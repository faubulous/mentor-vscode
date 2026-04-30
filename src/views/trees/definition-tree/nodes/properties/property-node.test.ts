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

import { XSD, RDF, RDFS } from '@faubulous/mentor-rdf';
import * as vscode from 'vscode';
import { PropertyNode } from '@src/views/trees/definition-tree/nodes/properties/property-node';

function makeContext(overrides: Partial<{ graphs: string[] }> = {}): any {
	return {
		graphs: ['urn:g1'],
		getResourceLabel: () => ({ value: 'Label', language: undefined }),
		getResourceTooltip: () => undefined,
		activeLanguageTag: undefined,
		activeLanguage: undefined,
		...overrides,
	};
}

function makeNode(uri = 'urn:ex#myProp'): PropertyNode {
	const ctx = makeContext();
	return new PropertyNode(ctx, `root/<${uri}>`, uri);
}

beforeEach(() => {
	mockSettingsGet = (k: string, d?: any) => {
		if (k === 'view.showReferences') return true;
		return d;
	};
	mockVocabularyStub = {
		hasShapes: vi.fn(() => false),
		getRange: vi.fn(() => undefined),
		getDatatype: vi.fn(() => undefined),
		getSubProperties: vi.fn(() => []),
		hasIndividuals: vi.fn(() => false),
	};
});

describe('PropertyNode', () => {
	describe('getPropertyType', () => {
		it('should return "dataProperty" for XSD.string', () => {
			expect(makeNode().getPropertyType(XSD.string)).toBe('dataProperty');
		});
		it('should return "dataProperty" for RDF.langString', () => {
			expect(makeNode().getPropertyType(RDF.langString)).toBe('dataProperty');
		});
		it('should return "dataProperty" for RDFS.Literal', () => {
			expect(makeNode().getPropertyType(RDFS.Literal)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.boolean', () => {
			expect(makeNode().getPropertyType(XSD.boolean)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.integer', () => {
			expect(makeNode().getPropertyType(XSD.integer)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.int', () => {
			expect(makeNode().getPropertyType(XSD.int)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.decimal', () => {
			expect(makeNode().getPropertyType(XSD.decimal)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.double', () => {
			expect(makeNode().getPropertyType(XSD.double)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.float', () => {
			expect(makeNode().getPropertyType(XSD.float)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.date', () => {
			expect(makeNode().getPropertyType(XSD.date)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.dateTime', () => {
			expect(makeNode().getPropertyType(XSD.dateTime)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.long', () => {
			expect(makeNode().getPropertyType(XSD.long)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.short', () => {
			expect(makeNode().getPropertyType(XSD.short)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.byte', () => {
			expect(makeNode().getPropertyType(XSD.byte)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.base64Binary', () => {
			expect(makeNode().getPropertyType(XSD.base64Binary)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.nonNegativeInteger', () => {
			expect(makeNode().getPropertyType(XSD.nonNegativeInteger)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.nonPositiveInteger', () => {
			expect(makeNode().getPropertyType(XSD.nonPositiveInteger)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.negativeInteger', () => {
			expect(makeNode().getPropertyType(XSD.negativeInteger)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.positiveInteger', () => {
			expect(makeNode().getPropertyType(XSD.positiveInteger)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.unsignedInt', () => {
			expect(makeNode().getPropertyType(XSD.unsignedInt)).toBe('dataProperty');
		});
		it('should return "dataProperty" for XSD.unsignedShort', () => {
			expect(makeNode().getPropertyType(XSD.unsignedShort)).toBe('dataProperty');
		});
		it('should return "objectProperty" for RDFS.Resource (non-literal class)', () => {
			expect(makeNode().getPropertyType(RDFS.Resource)).toBe('objectProperty');
		});
		it('should return "objectProperty" for an arbitrary IRI', () => {
			expect(makeNode().getPropertyType('urn:ex#SomeClass')).toBe('objectProperty');
		});
		it('should return "objectProperty" for undefined', () => {
			expect(makeNode().getPropertyType(undefined)).toBe('objectProperty');
		});
	});

	describe('getIconNameFromRange', () => {
		it('should return "calendar" for XSD.date', () => {
			expect(makeNode().getIconNameFromRange(XSD.date)).toBe('calendar');
		});
		it('should return "calendar" for XSD.dateTime', () => {
			expect(makeNode().getIconNameFromRange(XSD.dateTime)).toBe('calendar');
		});
		it('should return "symbol-boolean" for XSD.boolean', () => {
			expect(makeNode().getIconNameFromRange(XSD.boolean)).toBe('symbol-boolean');
		});
		it('should return "file-binary" for XSD.base64Binary', () => {
			expect(makeNode().getIconNameFromRange(XSD.base64Binary)).toBe('file-binary');
		});
		it('should return "symbol-number" for XSD.integer', () => {
			expect(makeNode().getIconNameFromRange(XSD.integer)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.int', () => {
			expect(makeNode().getIconNameFromRange(XSD.int)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.decimal', () => {
			expect(makeNode().getIconNameFromRange(XSD.decimal)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.double', () => {
			expect(makeNode().getIconNameFromRange(XSD.double)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.float', () => {
			expect(makeNode().getIconNameFromRange(XSD.float)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.long', () => {
			expect(makeNode().getIconNameFromRange(XSD.long)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.short', () => {
			expect(makeNode().getIconNameFromRange(XSD.short)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.byte', () => {
			expect(makeNode().getIconNameFromRange(XSD.byte)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.nonNegativeInteger', () => {
			expect(makeNode().getIconNameFromRange(XSD.nonNegativeInteger)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.positiveInteger', () => {
			expect(makeNode().getIconNameFromRange(XSD.positiveInteger)).toBe('symbol-number');
		});
		it('should return "symbol-number" for XSD.unsignedInt', () => {
			expect(makeNode().getIconNameFromRange(XSD.unsignedInt)).toBe('symbol-number');
		});
		it('should return "symbol-text" for XSD.string', () => {
			expect(makeNode().getIconNameFromRange(XSD.string)).toBe('symbol-text');
		});
		it('should return "symbol-text" for RDF.langString', () => {
			expect(makeNode().getIconNameFromRange(RDF.langString)).toBe('symbol-text');
		});
		it('should return "symbol-text" for RDFS.Literal', () => {
			expect(makeNode().getIconNameFromRange(RDFS.Literal)).toBe('symbol-text');
		});
		it('should return "rdf-object-property" for RDFS.Resource', () => {
			expect(makeNode().getIconNameFromRange(RDFS.Resource)).toBe('rdf-object-property');
		});
		it('should return "rdf-object-property" for undefined', () => {
			expect(makeNode().getIconNameFromRange(undefined)).toBe('rdf-object-property');
		});
		it('should return "rdf-object-property" for an arbitrary class IRI', () => {
			expect(makeNode().getIconNameFromRange('urn:ex#Foo')).toBe('rdf-object-property');
		});
	});

	describe('getIconColorFromRange', () => {
		it('should return a ThemeColor for dataProperty', () => {
			const color = makeNode().getIconColorFromRange(XSD.string);
			expect(color).toBeInstanceOf(vscode.ThemeColor);
		});
		it('should return a ThemeColor for objectProperty', () => {
			const color = makeNode().getIconColorFromRange(RDFS.Resource);
			expect(color).toBeInstanceOf(vscode.ThemeColor);
		});
	});

	describe('getRange', () => {
		it('should return the range from vocabulary.getRange when present', () => {
			mockVocabularyStub.getRange = vi.fn(() => RDFS.Resource);
			const node = makeNode('urn:ex#p');
			expect(node.getRange('urn:ex#p')).toBe(RDFS.Resource);
		});

		it('should fall back to vocabulary.getDatatype when getRange returns undefined', () => {
			mockVocabularyStub.getRange = vi.fn(() => undefined);
			mockVocabularyStub.getDatatype = vi.fn(() => XSD.string);
			const node = makeNode('urn:ex#p');
			expect(node.getRange('urn:ex#p')).toBe(XSD.string);
		});

		it('should return RDFS.Resource when both getRange and getDatatype return undefined', () => {
			mockVocabularyStub.getRange = vi.fn(() => undefined);
			mockVocabularyStub.getDatatype = vi.fn(() => undefined);
			const node = makeNode('urn:ex#p');
			expect(node.getRange('urn:ex#p')).toBe(RDFS.Resource);
		});

		it('should return RDFS.Resource when propertyUri is undefined', () => {
			const node = makeNode();
			expect(node.getRange(undefined)).toBe(RDFS.Resource);
		});
	});

	describe('getIcon', () => {
		it('should return a ThemeIcon when vocabulary returns a range', () => {
			mockVocabularyStub.getRange = vi.fn(() => XSD.string);
			const node = makeNode('urn:ex#myProp');
			const icon = node.getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect(icon?.id).toBe('symbol-text');
		});

		it('should return rdf-object-property icon when no range is known', () => {
			mockVocabularyStub.getRange = vi.fn(() => undefined);
			mockVocabularyStub.getDatatype = vi.fn(() => undefined);
			const node = makeNode('urn:ex#myProp');
			const icon = node.getIcon();
			expect(icon?.id).toBe('rdf-object-property');
		});
	});

	describe('getIconColor', () => {
		it('should return a ThemeColor', () => {
			mockVocabularyStub.getRange = vi.fn(() => XSD.boolean);
			const node = makeNode('urn:ex#myProp');
			expect(node.getIconColor()).toBeInstanceOf(vscode.ThemeColor);
		});
	});

	describe('getContextValue', () => {
		it('should return "resource" when hasShapes returns false', () => {
			mockVocabularyStub.hasShapes = vi.fn(() => false);
			const node = makeNode();
			expect(node.getContextValue()).toBe('resource');
		});

		it('should append " shape-target" when hasShapes returns true', () => {
			mockVocabularyStub.hasShapes = vi.fn(() => true);
			const node = makeNode();
			expect(node.getContextValue()).toBe('resource shape-target');
		});
	});

	describe('getChildren', () => {
		it('should return an empty array when vocabulary returns no sub-properties', () => {
			mockVocabularyStub.getSubProperties = vi.fn(() => []);
			const node = makeNode();
			expect(node.getChildren()).toEqual([]);
		});

		it('should return PropertyNode children for each sub-property IRI', () => {
			mockVocabularyStub.getSubProperties = vi.fn(() => ['urn:ex#subProp1', 'urn:ex#subProp2']);
			const node = makeNode();
			const children = node.getChildren();
			expect(children).toHaveLength(2);
			expect(children[0]).toBeInstanceOf(PropertyNode);
		});
	});
});

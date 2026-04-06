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

import { RDF } from '@faubulous/mentor-rdf';
import * as vscode from 'vscode';
import { PropertyClassNode } from './property-class-node';
import { PropertiesNode } from './properties-node';
import { PropertyNode } from './property-node';

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
		if (k === 'view.showPropertyTypes') return true;
		return d;
	};
	mockVocabularyStub = {
		hasIndividuals: vi.fn(() => false),
		getSubClasses: vi.fn(function*() {}),
		getSubjectsOfType: vi.fn(function*() {}),
		getRootPropertiesOfType: vi.fn(function*() {}),
		getPropertyTypes: vi.fn(function*() {}),
		getSubProperties: vi.fn(function*() {}),
		getProperties: vi.fn(function*() {}),
		hasType: vi.fn(() => false),
		getRootPropertiesPath: vi.fn(function*() {}),
		getRange: vi.fn(() => undefined),
		getDatatype: vi.fn(() => undefined),
		hasShapes: vi.fn(() => false),
	};
});

// ---- PropertyClassNode ----

describe('PropertyClassNode', () => {
	describe('getChildren', () => {
		it('should return PropertyNode children from vocabulary.getRootPropertiesOfType', () => {
			mockVocabularyStub.getRootPropertiesOfType = vi.fn(function*() { yield 'urn:ex#p1'; });
			const children = makeNode(PropertyClassNode).getChildren();
			expect(children).toHaveLength(1);
			expect(children[0]).toBeInstanceOf(PropertyNode);
		});

		it('should return empty array when no properties are found', () => {
			mockVocabularyStub.getRootPropertiesOfType = vi.fn(function*() {});
			expect(makeNode(PropertyClassNode).getChildren()).toEqual([]);
		});
	});

	describe('getClassNode', () => {
		it('should return a PropertyClassNode', () => {
			expect(makeNode(PropertyClassNode).getClassNode('urn:ex#pt')).toBeInstanceOf(PropertyClassNode);
		});
	});

	describe('getIndividualNode', () => {
		it('should return a PropertyNode', () => {
			expect(makeNode(PropertyClassNode).getIndividualNode('urn:ex#p')).toBeInstanceOf(PropertyNode);
		});
	});
});

// ---- PropertiesNode ----

describe('PropertiesNode', () => {
	describe('getContextValue', () => {
		it('should return "properties"', () => {
			expect(makeNode(PropertiesNode).getContextValue()).toBe('properties');
		});
	});

	describe('getIcon', () => {
		it('should return undefined', () => {
			expect(makeNode(PropertiesNode).getIcon()).toBeUndefined();
		});
	});

	describe('getLabel', () => {
		it('should return "Properties"', () => {
			expect(makeNode(PropertiesNode).getLabel()).toEqual({ label: 'Properties' });
		});
	});

	describe('getTooltip', () => {
		it('should return undefined', () => {
			expect(makeNode(PropertiesNode).getTooltip()).toBeUndefined();
		});
	});

	describe('getDescription', () => {
		it('should return count of properties as string', () => {
			mockVocabularyStub.getProperties = vi.fn(function*() { yield 'urn:ex#p1'; yield 'urn:ex#p2'; });
			expect(makeNode(PropertiesNode).getDescription()).toBe('2');
		});
	});

	describe('hasChildren (with showPropertyTypes = true)', () => {
		it('should return true when there are property types', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showPropertyTypes') return true;
				return true;
			};
			mockVocabularyStub.getPropertyTypes = vi.fn(function*() { yield 'urn:ex#T'; });
			expect(makeNode(PropertiesNode).hasChildren()).toBe(true);
		});

		it('should return false when there are no property types', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showPropertyTypes') return true;
				return true;
			};
			mockVocabularyStub.getPropertyTypes = vi.fn(function*() {});
			expect(makeNode(PropertiesNode).hasChildren()).toBe(false);
		});
	});

	describe('hasChildren (with showPropertyTypes = false)', () => {
		it('should return true when there are sub-properties', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showPropertyTypes') return false;
				return true;
			};
			mockVocabularyStub.getSubProperties = vi.fn(function*() { yield 'urn:ex#p'; });
			expect(makeNode(PropertiesNode).hasChildren()).toBe(true);
		});

		it('should return false when there are no sub-properties', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showPropertyTypes') return false;
				return true;
			};
			mockVocabularyStub.getSubProperties = vi.fn(function*() {});
			expect(makeNode(PropertiesNode).hasChildren()).toBe(false);
		});
	});

	describe('getChildren (with showPropertyTypes = true)', () => {
		it('should return PropertyClassNode children grouped by type', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showPropertyTypes') return true;
				return true;
			};
			mockVocabularyStub.getPropertyTypes = vi.fn(function*() { yield 'urn:ex#TypeA'; });
			const children = makeNode(PropertiesNode).getChildren();
			expect(children).toHaveLength(1);
			expect(children[0]).toBeInstanceOf(PropertyClassNode);
		});
	});

	describe('getChildren (with showPropertyTypes = false)', () => {
		it('should return PropertyNode children in flat list', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showPropertyTypes') return false;
				return true;
			};
			mockVocabularyStub.getSubProperties = vi.fn(function*() { yield 'urn:ex#p1'; });
			const children = makeNode(PropertiesNode).getChildren();
			expect(children).toHaveLength(1);
			expect(children[0]).toBeInstanceOf(PropertyNode);
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when IRI is not a property', () => {
			mockVocabularyStub.hasType = vi.fn(() => false);
			expect(makeNode(PropertiesNode).resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});

		it('should return undefined when property is a property but hierarchy is empty', () => {
			mockVocabularyStub.hasType = vi.fn(() => true);
			mockVocabularyStub.getRootPropertiesPath = vi.fn(function*() {});
			mockVocabularyStub.getPropertyTypes = vi.fn(function*() {});
			expect(makeNode(PropertiesNode).resolveNodeForUri('urn:ex#p')).toBeUndefined();
		});

		it('should walk flat hierarchy when showPropertyTypes is false', () => {
			mockSettingsGet = (k: string, d?: any) => {
				if (k === 'view.showPropertyTypes') return false;
				return true;
			};
			mockVocabularyStub.hasType = vi.fn((g: any, iri: any, type: any) => type === RDF.Property);
			mockVocabularyStub.getRootPropertiesPath = vi.fn(function*() {});
			mockVocabularyStub.getSubProperties = vi.fn(function*() {});
			expect(makeNode(PropertiesNode).resolveNodeForUri('urn:ex#p')).toBeUndefined();
		});
	});
});

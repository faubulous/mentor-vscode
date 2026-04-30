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
import { ValidatorNode } from '@src/views/trees/definition-tree/nodes/validators/validator-node';
import { ValidatorClassNode } from '@src/views/trees/definition-tree/nodes/validators/validator-class-node';
import { ValidatorsNode } from '@src/views/trees/definition-tree/nodes/validators/validators-node';

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
		hasSubjectsOfType: vi.fn(() => false),
		getSubjectsOfType: vi.fn(function*() {}),
		getValidators: vi.fn(function*() {}),
		hasType: vi.fn(() => false),
		getRootShapePath: vi.fn(function*() {}),
		getIndividualTypes: vi.fn(function*() {}),
	};
});

// ---- ValidatorNode ----

describe('ValidatorNode', () => {
	describe('getIcon', () => {
		it('should return a ThemeIcon for rdf-class', () => {
			const icon = makeNode(ValidatorNode).getIcon();
			expect(icon).toBeInstanceOf(vscode.ThemeIcon);
			expect(icon?.id).toBe('rdf-class');
		});
	});

	describe('getIconColor', () => {
		it('should return ThemeColor for mentor.color.class', () => {
			expect(makeNode(ValidatorNode).getIconColor()).toBeInstanceOf(vscode.ThemeColor);
		});
	});

	describe('getResourceUri', () => {
		it('should return undefined', () => {
			expect(makeNode(ValidatorNode).getResourceUri()).toBeUndefined();
		});
	});
});

// ---- ValidatorClassNode ----

describe('ValidatorClassNode', () => {
	describe('getOntologyGraphs', () => {
		it('should include the _SH graph plus document graphs', () => {
			const graphs = makeNode(ValidatorClassNode).getOntologyGraphs();
			expect(graphs.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('getSubClassIris', () => {
		it('should yield class IRIs that have subjects of that type', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:sh#Validator'; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => true);
			const iris = [...makeNode(ValidatorClassNode).getSubClassIris()];
			expect(iris).toHaveLength(1);
		});

		it('should skip class IRIs with no subjects', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:sh#Validator'; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => false);
			expect([...makeNode(ValidatorClassNode).getSubClassIris()]).toHaveLength(0);
		});
	});

	describe('getClassNode', () => {
		it('should return a ValidatorClassNode', () => {
			expect(makeNode(ValidatorClassNode).getClassNode('urn:ex#sub')).toBeInstanceOf(ValidatorClassNode);
		});
	});

	describe('getIndividualNode', () => {
		it('should return a ValidatorNode', () => {
			expect(makeNode(ValidatorClassNode).getIndividualNode('urn:ex#v')).toBeInstanceOf(ValidatorNode);
		});
	});
});

// ---- ValidatorsNode ----

describe('ValidatorsNode', () => {
	describe('getContextValue', () => {
		it('should return "validators"', () => {
			expect(makeNode(ValidatorsNode).getContextValue()).toBe('validators');
		});
	});

	describe('getIcon', () => {
		it('should return undefined', () => {
			expect(makeNode(ValidatorsNode).getIcon()).toBeUndefined();
		});
	});

	describe('getLabel', () => {
		it('should return "Validators"', () => {
			expect(makeNode(ValidatorsNode).getLabel()).toEqual({ label: 'Validators' });
		});
	});

	describe('getTooltip', () => {
		it('should return undefined', () => {
			expect(makeNode(ValidatorsNode).getTooltip()).toBeUndefined();
		});
	});

	describe('getDescription', () => {
		it('should return count of validators as string', () => {
			mockVocabularyStub.getValidators = vi.fn(function*() { yield 'urn:ex#v1'; });
			expect(makeNode(ValidatorsNode).getDescription()).toBe('1');
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when IRI is not a validator', () => {
			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() {});
			expect(makeNode(ValidatorsNode).resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});

		it('should walk hierarchy for validator IRIs', () => {
			mockVocabularyStub.hasType = vi.fn(() => true);
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			expect(makeNode(ValidatorsNode).resolveNodeForUri('urn:ex#v')).toBeUndefined();
		});

		it('should search by individual type when not a direct validator', () => {
			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield 'urn:ex#T'; });
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			expect(makeNode(ValidatorsNode).resolveNodeForUri('urn:ex#v')).toBeUndefined();
		});

		it('should return validator instance when typeNode contains the individual', () => {
			const typeIri = 'urn:ex#ValidatorClass';
			const validatorIri = 'urn:ex#myValidator';

			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield typeIri; });
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {}); // empty → rootToType = [typeIri]
			// Use unconditional mock so the 'mentor:validators' URI always yields typeIri
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield typeIri; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn((_g: any, uri: any) => uri === typeIri);
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*(_g: any, uri: any) {
				if (uri === typeIri) yield validatorIri;
			});

			// Use 'mentor:validators' so the root ValidatorsNode uses SH.Validator in getSubClassIris
			const result = makeNode(ValidatorsNode, 'mentor:validators').resolveNodeForUri(validatorIri);
			expect(result).not.toBeUndefined();
			expect(result!.uri).toBe(validatorIri);
		});

		it('should return undefined when typeNode found but target instance not in its children', () => {
			// Covers the if(found) FALSE branch: typeNode exists but instances don't contain the target
			const typeIri = 'urn:ex#ValidatorClass';
			const searchIri = 'urn:ex#notFound';

			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield typeIri; });
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield typeIri; }); // typeNode found
			mockVocabularyStub.hasSubjectsOfType = vi.fn((_g: any, uri: any) => uri === typeIri);
			// instances don't contain searchIri
			mockVocabularyStub.getSubjectsOfType = vi.fn(function*(_g: any, uri: any) {
				if (uri === typeIri) yield 'urn:ex#otherValidator';
			});

			const result = makeNode(ValidatorsNode, 'mentor:validators').resolveNodeForUri(searchIri);
			expect(result).toBeUndefined();
		});
	});
});

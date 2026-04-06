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
import { RuleNode } from './rule-node';
import { RuleClassNode } from './rule-class-node';
import { RulesNode } from './rules-node';

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
		getRules: vi.fn(function*() {}),
		hasType: vi.fn(() => false),
		getRootShapePath: vi.fn(function*() {}),
		getIndividualTypes: vi.fn(function*() {}),
	};
});

// ---- RuleNode ----

describe('RuleNode', () => {
	it('getResourceUri should return undefined', () => {
		expect(makeNode(RuleNode).getResourceUri()).toBeUndefined();
	});
});

// ---- RuleClassNode ----

describe('RuleClassNode', () => {
	describe('getOntologyGraphs', () => {
		it('should include the _SH graph plus document graphs', () => {
			const node = makeNode(RuleClassNode);
			const graphs = node.getOntologyGraphs();
			expect(graphs.length).toBeGreaterThanOrEqual(2);
			const lastGraph = graphs[graphs.length - 1];
			expect(lastGraph).toBe('urn:g1');
		});
	});

	describe('getSubClassIris', () => {
		it('should yield class IRIs that have subjects of that type', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:sh#Rule'; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => true);
			const node = makeNode(RuleClassNode);
			const iris = [...node.getSubClassIris()];
			expect(iris).toHaveLength(1);
		});

		it('should skip class IRIs that have no subjects of that type', () => {
			mockVocabularyStub.getSubClasses = vi.fn(function*() { yield 'urn:sh#Rule'; });
			mockVocabularyStub.hasSubjectsOfType = vi.fn(() => false);
			const node = makeNode(RuleClassNode);
			expect([...node.getSubClassIris()]).toHaveLength(0);
		});
	});

	describe('getClassNode', () => {
		it('should return a RuleClassNode', () => {
			const child = makeNode(RuleClassNode).getClassNode('urn:ex#sub');
			expect(child).toBeInstanceOf(RuleClassNode);
		});
	});

	describe('getIndividualNode', () => {
		it('should return a RuleNode', () => {
			const child = makeNode(RuleClassNode).getIndividualNode('urn:ex#rule');
			expect(child).toBeInstanceOf(RuleNode);
		});
	});
});

// ---- RulesNode ----

describe('RulesNode', () => {
	describe('getContextValue', () => {
		it('should return "rules"', () => {
			expect(makeNode(RulesNode).getContextValue()).toBe('rules');
		});
	});

	describe('getIcon', () => {
		it('should return undefined', () => {
			expect(makeNode(RulesNode).getIcon()).toBeUndefined();
		});
	});

	describe('getLabel', () => {
		it('should return "Rules"', () => {
			expect(makeNode(RulesNode).getLabel()).toEqual({ label: 'Rules' });
		});
	});

	describe('getTooltip', () => {
		it('should return undefined', () => {
			expect(makeNode(RulesNode).getTooltip()).toBeUndefined();
		});
	});

	describe('getDescription', () => {
		it('should return count of rules as string', () => {
			mockVocabularyStub.getRules = vi.fn(function*() { yield 'urn:ex#r1'; yield 'urn:ex#r2'; });
			expect(makeNode(RulesNode).getDescription()).toBe('2');
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined when IRI is not a rule', () => {
			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() {});
			expect(makeNode(RulesNode).resolveNodeForUri('urn:ex#x')).toBeUndefined();
		});

		it('should walk the hierarchy for rule IRIs', () => {
			mockVocabularyStub.hasType = vi.fn(() => true);
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			// With empty path, walkHierarchyPath returns undefined
			expect(makeNode(RulesNode).resolveNodeForUri('urn:ex#rule')).toBeUndefined();
		});

		it('should search by individual type when not a direct rule', () => {
			mockVocabularyStub.hasType = vi.fn(() => false);
			mockVocabularyStub.getIndividualTypes = vi.fn(function*() { yield 'urn:ex#Type'; });
			mockVocabularyStub.getRootShapePath = vi.fn(function*() {});
			mockVocabularyStub.getSubClasses = vi.fn(function*() {});
			// walkHierarchyPath with empty path → not found → returns undefined
			expect(makeNode(RulesNode).resolveNodeForUri('urn:ex#rule')).toBeUndefined();
		});
	});
});

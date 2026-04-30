import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

const mockContextService = {
	contexts: {} as Record<string, any>,
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return mockContextService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { ResourceReferenceProvider } from '@src/providers/resource-reference-provider';

describe('ResourceReferenceProvider', () => {
	let provider: ResourceReferenceProvider;
	const mockPosition = new vscode.Position(5, 10);

	beforeEach(() => {
		vi.clearAllMocks();
		mockContextService.contexts = {};
		provider = new ResourceReferenceProvider();
	});

	it('returns null when no context for document', () => {
		const doc = { uri: vscode.Uri.parse('file:///test.ttl'), getText: () => '' } as any;
		const result = provider.provideReferences(doc, mockPosition);
		expect(result).toBeNull();
	});

	it('returns null when context has no IRI at position', () => {
		mockContextService.contexts = {
			'file:///test.ttl': {
				uri: vscode.Uri.parse('file:///test.ttl'),
				getIriAtPosition: vi.fn(() => null),
				references: {},
				isTemporary: false,
			}
		};
		const doc = { uri: vscode.Uri.parse('file:///test.ttl') } as any;
		const result = provider.provideReferences(doc, mockPosition);
		expect(result).toBeNull();
	});

	it('returns locations for IRI at position', () => {
		const range = { start: { line: 1, character: 0 }, end: { line: 1, character: 30 } };
		mockContextService.contexts = {
			'file:///test.ttl': {
				uri: vscode.Uri.parse('file:///test.ttl'),
				getIriAtPosition: vi.fn(() => 'http://example.org/Class'),
				references: { 'http://example.org/Class': [range] },
				isTemporary: false,
			}
		};
		const doc = { uri: vscode.Uri.parse('file:///test.ttl') } as any;
		const result = provider.provideReferences(doc, mockPosition);
		expect(result).toHaveLength(1);
	});

	it('provides references for IRI across all contexts', () => {
		const range = { start: { line: 5, character: 2 }, end: { line: 5, character: 40 } };
		mockContextService.contexts = {
			'file:///a.ttl': {
				uri: vscode.Uri.parse('file:///a.ttl'),
				references: { 'http://example.org/Class': [range] },
				isTemporary: false,
			},
			'file:///b.ttl': {
				uri: vscode.Uri.parse('file:///b.ttl'),
				references: { 'http://example.org/Class': [range] },
				isTemporary: false,
			},
		};
		const locations = provider.provideReferencesForIri('http://example.org/Class');
		expect(locations).toHaveLength(2);
	});

	it('skips temporary contexts when providing references', () => {
		const range = { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } };
		mockContextService.contexts = {
			'file:///temp.ttl': {
				uri: vscode.Uri.parse('file:///temp.ttl'),
				references: { 'http://example.org/C': [range] },
				isTemporary: true,
			},
		};
		const locations = provider.provideReferencesForIri('http://example.org/C');
		expect(locations).toHaveLength(0);
	});
});

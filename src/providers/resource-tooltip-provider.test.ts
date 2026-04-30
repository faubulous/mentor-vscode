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

import { ResourceTooltipProvider } from '@src/providers/resource-tooltip-provider';

describe('ResourceTooltipProvider', () => {
	let provider: ResourceTooltipProvider;
	const mockPosition = new vscode.Position(5, 10);

	beforeEach(() => {
		vi.clearAllMocks();
		mockContextService.contexts = {};
		provider = new ResourceTooltipProvider();
	});

	it('returns null when no context for document', () => {
		const doc = { uri: vscode.Uri.parse('file:///test.ttl') } as any;
		expect(provider.provideHover(doc, mockPosition)).toBeNull();
	});

	it('returns hover with IRI tooltip when IRI at position', () => {
		mockContextService.contexts = {
			'file:///test.ttl': {
				getIriAtPosition: vi.fn(() => 'http://example.org/Class'),
				getLiteralAtPosition: vi.fn(() => null),
				getResourceTooltip: vi.fn(() => 'This is a class.'),
			}
		};
		const doc = { uri: vscode.Uri.parse('file:///test.ttl') } as any;
		const result = provider.provideHover(doc, mockPosition) as any;
		expect(result).toBeDefined();
		expect(result.contents).toBe('This is a class.');
	});

	it('returns hover with literal value when literal at position', () => {
		mockContextService.contexts = {
			'file:///test.ttl': {
				getIriAtPosition: vi.fn(() => null),
				getLiteralAtPosition: vi.fn(() => "hello world"),
			}
		};
		const doc = { uri: vscode.Uri.parse('file:///test.ttl') } as any;
		const result = provider.provideHover(doc, mockPosition) as any;
		expect(result).toBeDefined();
		expect(result.contents).toBe('hello world');
	});

	it('returns null when nothing at position', () => {
		mockContextService.contexts = {
			'file:///test.ttl': {
				getIriAtPosition: vi.fn(() => null),
				getLiteralAtPosition: vi.fn(() => null),
			}
		};
		const doc = { uri: vscode.Uri.parse('file:///test.ttl') } as any;
		expect(provider.provideHover(doc, mockPosition)).toBeNull();
	});
});

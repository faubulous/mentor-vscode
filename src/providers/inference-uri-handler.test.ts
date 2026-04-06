import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

vi.mock('@faubulous/mentor-rdf', () => ({
	Store: vi.fn(),
}));

vi.mock('@src/providers/inference-uri', () => ({
	InferenceUri: {
		toInferenceUri: vi.fn((uri: string) => `urn:inference:${uri}`),
	},
}));

const mockStore = {
	hasGraph: vi.fn(() => false),
	serializeGraph: vi.fn(async () => ''),
};

const mockPrefixLookupService = {
	getInferencePrefixes: vi.fn(() => ({})),
};

const mockSubscriptions: any[] = [];
const mockExtensionContext = {
	extension: { id: 'test.extension' },
	subscriptions: mockSubscriptions,
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return mockExtensionContext;
			if (token === 'Store') return mockStore;
			if (token === 'PrefixLookupService') return mockPrefixLookupService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { InferenceUriHandler } from './inference-uri-handler';

describe('InferenceUriHandler', () => {
	let handler: InferenceUriHandler;
	let mockShowErrorMessage: any;
	let mockOpenTextDocument: any;
	let mockShowTextDocument: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSubscriptions.length = 0;
		mockShowErrorMessage = vi.fn(async () => undefined);
		mockOpenTextDocument = vi.fn(async () => ({ uri: vscode.Uri.parse('untitled:1') } as any));
		mockShowTextDocument = vi.fn(async () => undefined);
		(vscode.window as any).showErrorMessage = mockShowErrorMessage;
		(vscode.workspace as any).openTextDocument = mockOpenTextDocument;
		(vscode.window as any).showTextDocument = mockShowTextDocument;
		handler = new InferenceUriHandler();
	});

	it('sets extensionId from context', () => {
		expect(handler.extensionId).toBe('test.extension');
	});

	it('registers URI handler in extension context', () => {
		expect(mockSubscriptions.length).toBeGreaterThan(0);
	});

	it('ignores URIs with wrong authority', async () => {
		const uri = vscode.Uri.parse('vscode://someother.extension/inference');
		await handler.handleUri(uri);
		expect(mockStore.hasGraph).not.toHaveBeenCalled();
	});

	it('ignores URIs with wrong path', async () => {
		const uri = vscode.Uri.parse('vscode://test.extension/other');
		await handler.handleUri(uri);
		expect(mockStore.hasGraph).not.toHaveBeenCalled();
	});

	it('shows error when no URI provided in query', async () => {
		const uri = vscode.Uri.parse('vscode://test.extension/inference');
		await handler.handleUri(uri);
		expect(mockShowErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Failed to load inference graph'));
	});

	it('does not open document when graph does not exist', async () => {
		const targetUri = encodeURIComponent('http://example.org/graph');
		const uri = vscode.Uri.parse(`vscode://test.extension/inference?uri=${targetUri}`);
		mockStore.hasGraph.mockReturnValue(false);
		await handler.handleUri(uri);
		expect(mockOpenTextDocument).not.toHaveBeenCalled();
	});

	it('opens document when graph exists', async () => {
		mockStore.hasGraph.mockReturnValue(true);
		mockStore.serializeGraph.mockResolvedValue('@prefix ex: <http://example.org/> .');
		const targetUri = encodeURIComponent('http://example.org/graph');
		const uri = vscode.Uri.parse(`vscode://test.extension/inference?uri=${targetUri}`);
		await handler.handleUri(uri);
		expect(mockOpenTextDocument).toHaveBeenCalledWith(expect.objectContaining({ language: 'turtle' }));
		expect(mockShowTextDocument).toHaveBeenCalled();
	});
});

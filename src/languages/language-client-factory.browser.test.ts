import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBrowserLanguageClient } from './language-client-factory.browser';
import { Uri } from '@src/utilities/mocks/vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Mock vscode-languageclient/browser — the real module requires a browser Worker
// and the VSCode runtime, neither of which is available in the Node.js test env.
const { MockLanguageClient, MockWorker } = vi.hoisted(() => {
	const mockInstance = {
		start: vi.fn(async () => { }),
		stop: vi.fn(async () => { }),
		onNotification: vi.fn(() => ({ dispose: () => { } })),
	};
	return {
		MockLanguageClient: vi.fn(function () { return mockInstance; }),
		// Worker is a browser global; stub it so the factory can call `new Worker(...)`.
		MockWorker: vi.fn(function () { return { postMessage: vi.fn(), terminate: vi.fn() }; }),
	};
});

vi.mock('vscode-languageclient/browser', () => ({
	LanguageClient: MockLanguageClient,
}));

vi.stubGlobal('Worker', MockWorker);

function makeContext() {
	const extensionUri = Uri.parse('file:///extension');

	return {
		extensionUri,
		subscriptions: { push: vi.fn() },
	} as any;
}

function makeOptions(overrides: Partial<Parameters<typeof createBrowserLanguageClient>[1]> = {}) {
	return {
		channelId: 'test-channel',
		languageName: 'Test',
		serverPath: 'dist/test-language-server.js',
		languageId: 'test',
		outputChannel: { name: 'Test', append: vi.fn(), appendLine: vi.fn(), dispose: vi.fn() } as any,
		...overrides,
	};
}

describe('createBrowserLanguageClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('constructs without throwing', () => {
		expect(() => createBrowserLanguageClient(makeContext(), makeOptions())).not.toThrow();
	});

	it('returns an object with start, stop, and onNotification methods', () => {
		const client = createBrowserLanguageClient(makeContext(), makeOptions());

		expect(typeof client.start).toBe('function');
		expect(typeof client.stop).toBe('function');
		expect(typeof client.onNotification).toBe('function');
	});

	it('creates a Worker from the resolved server URI', () => {
		const context = makeContext();
		const options = makeOptions({ serverPath: 'dist/test-language-server.js' });

		createBrowserLanguageClient(context, options);

		expect(MockWorker).toHaveBeenCalledOnce();

		// The Worker URL should contain the server path
		const call = MockWorker.mock.calls[0] as any;
		const url = call[0] as string;

		expect(url).toContain('test-language-server.js');
	});

	it('passes channelId as the client id', () => {
		createBrowserLanguageClient(makeContext(), makeOptions({ channelId: 'my-channel' }));

		expect(MockLanguageClient).toHaveBeenCalledWith(
			'my-channel',
			expect.any(String),
			expect.objectContaining({ diagnosticCollectionName: 'my-channel' }),
			expect.any(Object),
		);
	});

	it('passes languageName in the client title', () => {
		createBrowserLanguageClient(makeContext(), makeOptions({ languageName: 'Turtle' }));

		const call = MockLanguageClient.mock.calls[0] as any;
		const title = call[1] as string;

		expect(title).toContain('Turtle');
	});

	it('sets the documentSelector to the provided languageId', () => {
		createBrowserLanguageClient(makeContext(), makeOptions({ languageId: 'sparql' }));

		const call = MockLanguageClient.mock.calls[0] as any;
		const options = call[2] as { documentSelector: { language: string }[] };

		expect(options.documentSelector).toEqual([{ language: 'sparql' }]);
	});

	it('passes the outputChannel to the client options', () => {
		const outputChannel = {
			name: 'My Output',
			append: vi.fn(),
			appendLine: vi.fn(),
			dispose: vi.fn()
		} as any;

		createBrowserLanguageClient(makeContext(), makeOptions({ outputChannel }));

		const call = MockLanguageClient.mock.calls[0] as any;
		const options = call[2] as { outputChannel: typeof outputChannel };

		expect(options.outputChannel).toBe(outputChannel);
	});
});

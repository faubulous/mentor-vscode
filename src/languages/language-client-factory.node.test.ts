import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNodeLanguageClient } from '@src/languages/language-client-factory.node';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Mock vscode-languageclient/node — the real module requires the `vscode` runtime
// and would attempt to spawn a Node.js child process via IPC transport.
const { MockLanguageClient } = vi.hoisted(() => {
	const mockInstance = {
		start: vi.fn(async () => { }),
		stop: vi.fn(async () => { }),
		onNotification: vi.fn(() => ({ dispose: () => { } })),
	};

	return {
		MockLanguageClient: vi.fn(function () {
			return mockInstance;
		})
	};
});

vi.mock('vscode-languageclient/node', () => ({
	LanguageClient: MockLanguageClient,
	TransportKind: { ipc: 'ipc', stdio: 'stdio', pipe: 'pipe', socket: 'socket' },
}));

function createContext(extensionPath = '/home/user/.vscode/extensions/mentor') {
	return {
		extensionPath,
		extensionUri: { toString: () => `file://${extensionPath}` },
		asAbsolutePath: (relativePath: string) => `${extensionPath}/${relativePath}`,
		subscriptions: { push: vi.fn() },
	} as any;
}

function createOptions(overrides: Partial<Parameters<typeof createNodeLanguageClient>[1]> = {}) {
	return {
		channelId: 'test-channel',
		languageName: 'Test',
		serverPath: 'dist/test-language-server.js',
		languageId: 'test',
		outputChannel: { name: 'Test', append: vi.fn(), appendLine: vi.fn(), dispose: vi.fn() } as any,
		...overrides,
	};
}

describe('createNodeLanguageClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('constructs without throwing', () => {
		expect(() => createNodeLanguageClient(createContext(), createOptions())).not.toThrow();
	});

	it('returns an object with start, stop, and onNotification methods', () => {
		const client = createNodeLanguageClient(createContext(), createOptions());

		expect(typeof client.start).toBe('function');
		expect(typeof client.stop).toBe('function');
		expect(typeof client.onNotification).toBe('function');
	});

	it('derives the node server module path from serverPath using a -node suffix', () => {
		const ctx = createContext('/ext');

		createNodeLanguageClient(ctx, createOptions({ serverPath: 'dist/turtle-language-server.js' }));

		const call = MockLanguageClient.mock.calls[0] as any[];
		const options = call[2] as { run: { module: string }; debug: { module: string } };

		// Both run and debug entries should point to the .node.js variant
		expect(options).toBeDefined();
		expect(options!.run.module).toContain('turtle-language-server.node.js');
		expect(options!.debug.module).toContain('turtle-language-server.node.js');
	});

	it('resolves the server module path using context.asAbsolutePath', () => {
		const ctx = createContext('/my/extension');

		createNodeLanguageClient(ctx, createOptions({ serverPath: 'dist/turtle-language-server.js' }));

		const call = MockLanguageClient.mock.calls[0] as any;
		const options = call[2] as { run: { module: string }; debug: { module: string } };

		expect(options).toBeDefined();
		expect(options.run.module).toBe('/my/extension/dist/turtle-language-server.node.js');
	});

	it('uses IPC transport for both run and debug entries', () => {
		createNodeLanguageClient(createContext(), createOptions());

		const call = MockLanguageClient.mock.calls[0] as any;
		const options = call[2] as { run: { transport: string }; debug: { transport: string } };

		expect(options.run.transport).toBe('ipc');
		expect(options.debug.transport).toBe('ipc');
	});

	it('includes --inspect flag in debug server options', () => {
		createNodeLanguageClient(createContext(), createOptions());

		const call = MockLanguageClient.mock.calls[0] as any;
		const options = call[2] as { debug: { transport: string; options?: { execArgv?: string[] } } };
		const args: string[] = options.debug.options?.execArgv ?? [];

		expect(args.some((a: string) => a.startsWith('--inspect'))).toBe(true);
	});

	it('passes channelId as the client id', () => {
		createNodeLanguageClient(createContext(), createOptions({ channelId: 'my-channel' }));

		expect(MockLanguageClient).toHaveBeenCalledWith(
			'my-channel',
			expect.any(String),
			expect.any(Object),
			expect.objectContaining({ diagnosticCollectionName: 'my-channel' }),
		);
	});

	it('passes languageName in the client title', () => {
		createNodeLanguageClient(createContext(), createOptions({ languageName: 'Turtle' }));

		const call = MockLanguageClient.mock.calls[0] as any;
		const title = call[1] as string;

		expect(title).toContain('Turtle');
	});

	it('sets the documentSelector to the provided languageId', () => {
		createNodeLanguageClient(createContext(), createOptions({ languageId: 'sparql' }));

		const call = MockLanguageClient.mock.calls[0] as any;
		const options = call[3] as { documentSelector: { language: string }[] };

		expect(options.documentSelector).toEqual([{ language: 'sparql' }]);
	});

	it('passes the outputChannel to the client options', () => {
		const outputChannel = {
			name: 'My Output',
			append: vi.fn(),
			appendLine: vi.fn(),
			dispose: vi.fn()
		} as any;

		createNodeLanguageClient(createContext(), createOptions({ outputChannel }));

		const call = MockLanguageClient.mock.calls[0] as any;
		const clientOptions = call[3] as { outputChannel: any };

		expect(clientOptions.outputChannel).toBe(outputChannel);
	});
});

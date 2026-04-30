import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const mockClientStart = vi.fn(async () => {});
const mockClientStop = vi.fn(async () => {});
const mockClientOnNotification = vi.fn(() => ({ dispose: () => {} }));
const mockSubscriptions: { push: ReturnType<typeof vi.fn> } = { push: vi.fn() };

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
			if (token === 'LanguageClientFactory') {
				return (_ctx: any, _opts: any) => ({
					start: mockClientStart,
					stop: mockClientStop,
					onNotification: mockClientOnNotification,
				});
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { LanguageClientBase } from '@src/languages/language-client';

/** Concrete subclass to allow instantiation of the abstract base. */
class ConcreteClient extends LanguageClientBase {
	constructor() {
		super('test', 'Test');
	}
}

describe('LanguageClientBase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('constructs without throwing', () => {
		expect(() => new ConcreteClient()).not.toThrow();
	});

	it('sets the correct languageId and languageName', () => {
		const client = new ConcreteClient();
		expect(client.languageId).toBe('test');
		expect(client.languageName).toBe('Test');
	});

	it('sets serverPath from languageId', () => {
		const client = new ConcreteClient();
		expect(client.serverPath).toBe('dist/test-language-server.js');
	});

	it('creates an output channel named after the language', () => {
		const client = new ConcreteClient();
		expect(client.channel).toBeDefined();
	});

	it('calls client.start() during construction', async () => {
		new ConcreteClient();
		// start() resolves asynchronously; give it a tick
		await Promise.resolve();
		expect(mockClientStart).toHaveBeenCalled();
	});

	it('pushes to extension context subscriptions', () => {
		new ConcreteClient();
		expect(mockSubscriptions.push).toHaveBeenCalled();
	});

	it('dispose calls client.stop()', async () => {
		const client = new ConcreteClient();
		await client.dispose();
		expect(mockClientStop).toHaveBeenCalled();
	});

	it('dispose does not throw when client is undefined', async () => {
		const client = new ConcreteClient();
		(client as any).client = undefined;
		await expect(client.dispose()).resolves.not.toThrow();
	});
});

import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));
vi.mock('@faubulous/mentor-rdf-parsers', () => ({
	RdfSyntax: { Turtle: 'Turtle', Sparql: 'Sparql' },
	RdfToken: {},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return { subscriptions: { push: vi.fn() } };
			if (token === 'LanguageClientFactory') {
				return () => ({
					start: vi.fn(async () => {}),
					stop: vi.fn(async () => {}),
					onNotification: vi.fn(() => ({ dispose: () => {} })),
				});
			}
			if (token === 'DocumentContextService') return { contexts: {}, resolveTokens: vi.fn() };
			if (token === 'DocumentFactory') return { create: vi.fn(() => ({})) };
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/languages', async () => {
	const { LanguageClientBase } = await import('@src/languages/language-client');
	return {
		LanguageClientBase,
		TurtleDocument: class TurtleDocument {
			setTokens = vi.fn();
			constructor(public uri: any, _syntax: any) {}
		},
	};
});

import { TrigLanguageClient } from '@src/languages/trig/trig-language-client';

describe('TrigLanguageClient', () => {
	it('constructs with trig languageId', () => {
		const client = new TrigLanguageClient();
		expect(client.languageId).toBe('trig');
		expect(client.languageName).toBe('TriG');
	});
});

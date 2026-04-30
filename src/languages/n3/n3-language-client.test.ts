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

import { N3LanguageClient } from '@src/languages/n3/n3-language-client';

describe('N3LanguageClient', () => {
	it('constructs with n3 languageId', () => {
		const client = new N3LanguageClient();
		expect(client.languageId).toBe('n3');
		expect(client.languageName).toBe('N3');
	});
});

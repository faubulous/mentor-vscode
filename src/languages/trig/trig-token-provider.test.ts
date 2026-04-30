import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({
	TurtleFormatter: class TurtleFormatterMock {
		formatFromText(text: string) { return { output: text }; }
	},
}));

vi.mock('@faubulous/mentor-rdf-parsers', async () => {
	const actual = await vi.importActual<any>('@faubulous/mentor-rdf-parsers');
	return {
		...actual,
		RdfToken: {
			...actual.RdfToken,
			PREFIX: { name: 'PREFIX' },
			TTL_PREFIX: { name: 'TTL_PREFIX' },
		},
	};
});

const mockSubscriptions: any[] = [];

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
			if (token === 'DocumentContextService') return { onDidChangeDocumentContext: vi.fn() };
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { TrigTokenProvider } from '@src/languages/trig/trig-token-provider';

beforeEach(() => {
	mockSubscriptions.length = 0;
	vi.clearAllMocks();
});

describe('TrigTokenProvider', () => {
	it('constructs without throwing', () => {
		expect(() => new TrigTokenProvider()).not.toThrow();
	});

	it('getLanguages returns [trig]', () => {
		const provider = new TrigTokenProvider();
		const languages = (provider as any).getLanguages();
		expect(languages).toEqual(['trig']);
	});

	it('pushes disposables to extension context subscriptions', () => {
		new TrigTokenProvider();
		expect(mockSubscriptions.length).toBeGreaterThanOrEqual(1);
	});
});

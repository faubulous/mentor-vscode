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

import * as vscode from 'vscode';
import { TurtleTokenProvider } from './turtle-token-provider';

beforeEach(() => {
	mockSubscriptions.length = 0;
	vi.clearAllMocks();
});

describe('TurtleTokenProvider', () => {
	it('constructs without throwing', () => {
		expect(() => new TurtleTokenProvider()).not.toThrow();
	});

	it('pushes disposables to extension context subscriptions', () => {
		new TurtleTokenProvider();
		expect(mockSubscriptions.length).toBeGreaterThanOrEqual(1);
	});

	it('getLanguages returns expected language list', () => {
		const provider = new TurtleTokenProvider();
		const languages = (provider as any).getLanguages();
		expect(languages).toEqual(['ntriples', 'nquads', 'turtle', 'n3']);
	});

	it('registerForLanguage returns an array of disposables', () => {
		const provider = new TurtleTokenProvider();
		const disposables = (provider as any).registerForLanguage('turtle');
		expect(Array.isArray(disposables)).toBe(true);
		expect(disposables.length).toBeGreaterThan(0);
	});

	it('registers providers for each language returned by getLanguages', () => {
		const spy = vi.spyOn(vscode.languages, 'registerRenameProvider');
		new TurtleTokenProvider();
		// One rename provider registration per language (ntriples, nquads, turtle, n3)
		expect(spy).toHaveBeenCalledTimes(4);
	});
});

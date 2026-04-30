import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const mockSubscriptions: any[] = [];

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { XmlTokenProvider } from '@src/languages/xml/xml-token-provider';

beforeEach(() => {
	mockSubscriptions.length = 0;
	vi.clearAllMocks();
});

describe('XmlTokenProvider', () => {
	it('constructs without throwing', () => {
		expect(() => new XmlTokenProvider()).not.toThrow();
	});

	it('pushes disposables to extension context subscriptions', () => {
		new XmlTokenProvider();
		expect(mockSubscriptions.length).toBeGreaterThanOrEqual(1);
	});

	it('registerForLanguage returns an array of disposables', () => {
		const provider = new XmlTokenProvider();
		const disposables = (provider as any).registerForLanguage('xml');
		expect(Array.isArray(disposables)).toBe(true);
		expect(disposables.length).toBeGreaterThan(0);
	});

	it('registers a hover provider for xml', () => {
		const spy = vi.spyOn(vscode.languages, 'registerHoverProvider');
		new XmlTokenProvider();
		expect(spy).toHaveBeenCalledWith({ language: 'xml' }, expect.anything());
	});

	it('registers a rename provider for xml', () => {
		const spy = vi.spyOn(vscode.languages, 'registerRenameProvider');
		new XmlTokenProvider();
		expect(spy).toHaveBeenCalledWith({ language: 'xml' }, expect.anything());
	});
});

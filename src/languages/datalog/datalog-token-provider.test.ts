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
import { DatalogTokenProvider } from './datalog-token-provider';

beforeEach(() => {
	mockSubscriptions.length = 0;
	vi.clearAllMocks();
});

describe('DatalogTokenProvider', () => {
	it('constructs without throwing', () => {
		expect(() => new DatalogTokenProvider()).not.toThrow();
	});

	it('registers a rename provider for the datalog language', () => {
		const spy = vi.spyOn(vscode.languages, 'registerRenameProvider');
		new DatalogTokenProvider();
		expect(spy).toHaveBeenCalledWith({ language: 'datalog' }, expect.anything());
	});

	it('pushes disposable to extension context subscriptions', () => {
		new DatalogTokenProvider();
		expect(mockSubscriptions.length).toBeGreaterThanOrEqual(1);
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockFetchPrefixes: ReturnType<typeof vi.fn>;
let mockGlobalStateUpdate: ReturnType<typeof vi.fn>;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'PrefixDownloaderService') {
				return {
					endpointUrl: 'https://prefix.cc',
					fetchPrefixes: (...args: any[]) => mockFetchPrefixes(...args),
				};
			}
			if (token === 'ExtensionContext') {
				return {
					globalState: {
						update: (...args: any[]) => mockGlobalStateUpdate(...args),
					},
				};
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

import * as vscode from 'vscode';
import { updatePrefixes } from './update-prefixes';

beforeEach(() => {
	mockFetchPrefixes = vi.fn(async () => ({}));
	mockGlobalStateUpdate = vi.fn();
});

describe('updatePrefixes command', () => {
	it('should have correct id', () => {
		expect(updatePrefixes.id).toBe('mentor.command.updatePrefixes');
	});

	it('should call withProgress without throwing', async () => {
		(vscode as any).window.withProgress = vi.fn(async (_opts: any, task: any) => {
			await task({ report: vi.fn() });
		});
		mockFetchPrefixes.mockResolvedValue({ ex: 'http://example.org/' });
		await updatePrefixes.handler();
		expect(mockFetchPrefixes).toHaveBeenCalled();
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockIndexWorkspace: ReturnType<typeof vi.fn<(...args: unknown[]) => unknown>>;
let mockDiscoverFiles: ReturnType<typeof vi.fn<(...args: unknown[]) => unknown>>;
let mockStoreClear: ReturnType<typeof vi.fn<(...args: unknown[]) => unknown>>;
let mockLoadFrameworkVocabularies: ReturnType<typeof vi.fn<(...args: unknown[]) => unknown>>;
let mockLoadShapeGraphs: ReturnType<typeof vi.fn<(...args: unknown[]) => unknown>>;

vi.mock('@src/services/core/preset-graphs', () => ({
	loadFrameworkVocabularies: (...args: any[]) => mockLoadFrameworkVocabularies(...args),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: ServiceToken) => {
			if (token === ServiceToken.Store) {
				return {
					clear: (...args: any[]) => mockStoreClear(...args),
				};
			}

			if (token === ServiceToken.WorkspaceIndexerService) {
				return { indexWorkspace: (...args: any[]) => mockIndexWorkspace(...args) };
			}

			if (token === ServiceToken.WorkspaceFileService) {
				return { discoverFiles: (...args: any[]) => mockDiscoverFiles(...args) };
			}

			if (token === ServiceToken.ShapeGraphService) {
				return { loadAll: (...args: any[]) => mockLoadShapeGraphs(...args) };
			}

			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { ServiceToken } from '@src/services/tokens';
import { reindexWorkspace } from '@src/commands/workspace/reindex-workspace';

beforeEach(() => {
	mockIndexWorkspace = vi.fn();
	mockDiscoverFiles = vi.fn(async () => undefined);
	mockStoreClear = vi.fn();
	mockLoadFrameworkVocabularies = vi.fn();
	mockLoadShapeGraphs = vi.fn(async () => undefined);
});

describe('reindexWorkspace command', () => {
	it('should have correct id', () => {
		expect(reindexWorkspace.id).toBe('mentor.command.reindexWorkspace');
	});

	it('should call indexWorkspace with force=true', async () => {
		await reindexWorkspace.handler();
		expect(mockIndexWorkspace).toHaveBeenCalledWith(true);
	});

	it('rediscovers the workspace files before reindexing them', async () => {
		await reindexWorkspace.handler();

		expect(mockDiscoverFiles).toHaveBeenCalledOnce();
		expect(mockDiscoverFiles.mock.invocationCallOrder[0]).toBeLessThan(mockIndexWorkspace.mock.invocationCallOrder[0]);
	});

	it('restores the preset and user shape graphs after the wipe', async () => {
		await reindexWorkspace.handler();
		expect(mockLoadShapeGraphs).toHaveBeenCalled();
	});

	it('clears the whole store before the framework ontologies are loaded again', async () => {
		await reindexWorkspace.handler();

		expect(mockStoreClear).toHaveBeenCalledOnce();
		expect(mockStoreClear.mock.invocationCallOrder[0]).toBeLessThan(mockLoadFrameworkVocabularies.mock.invocationCallOrder[0]);
		expect(mockLoadFrameworkVocabularies.mock.invocationCallOrder[0]).toBeLessThan(mockIndexWorkspace.mock.invocationCallOrder[0]);
	});
});

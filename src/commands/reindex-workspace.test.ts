import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockIndexWorkspace: ReturnType<typeof vi.fn>;
let mockStoreGetGraphs: ReturnType<typeof vi.fn>;
let mockStoreDeleteGraphs: ReturnType<typeof vi.fn>;
let mockStoreLoadFrameworkOntologies: ReturnType<typeof vi.fn>;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'Store') {
				return {
					getGraphs: (...args: any[]) => mockStoreGetGraphs(...args),
					deleteGraphs: (...args: any[]) => mockStoreDeleteGraphs(...args),
					loadFrameworkOntologies: (...args: any[]) => mockStoreLoadFrameworkOntologies(...args),
				};
			}

			if (token === 'WorkspaceIndexerService') {
				return { indexWorkspace: (...args: any[]) => mockIndexWorkspace(...args) };
			}

			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { reindexWorkspace } from '@src/commands/reindex-workspace';

beforeEach(() => {
	mockIndexWorkspace = vi.fn();
	mockStoreGetGraphs = vi.fn(() => []);
	mockStoreDeleteGraphs = vi.fn();
	mockStoreLoadFrameworkOntologies = vi.fn(async () => undefined);
});

describe('reindexWorkspace command', () => {
	it('should have correct id', () => {
		expect(reindexWorkspace.id).toBe('mentor.command.reindexWorkspace');
	});

	it('should call indexWorkspace with force=true', async () => {
		await reindexWorkspace.handler();
		expect(mockIndexWorkspace).toHaveBeenCalledWith(true);
	});
});

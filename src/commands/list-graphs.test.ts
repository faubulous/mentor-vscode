import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { mockExecuteBackgroundQuery, mockGetConfig } = vi.hoisted(() => ({
	mockExecuteBackgroundQuery: vi.fn(async () => {}),
	mockGetConfig: vi.fn(() => ({ get: (_k: string, d?: any) => d })),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlResultsController') {
				return { executeBackgroundQuery: mockExecuteBackgroundQuery };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: mockGetConfig,
}));

import * as vscode from 'vscode';
import { listGraphs } from '@src/commands/list-graphs';

beforeEach(() => {
	vi.clearAllMocks();
	mockGetConfig.mockImplementation(() => ({ get: (_k: string, d?: any) => d }));
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
});

describe('listGraphs command', () => {
	it('should have correct id', () => {
		expect(listGraphs.id).toBe('mentor.command.listGraphs');
	});

	it('should show error when no query is configured', async () => {
		await listGraphs.handler({ id: 'conn-1', endpointUrl: 'http://sparql.example.org' } as any);
		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
	});

	it('should execute background query when query is configured', async () => {
		const queryText = 'SELECT DISTINCT ?g WHERE { GRAPH ?g {} }';
		mockGetConfig.mockImplementation(() => ({
			get: (k: string, d?: any) => k === 'sparql.listGraphsQuery' ? queryText : d,
		}));
		const connection = { id: 'conn-1', endpointUrl: 'http://sparql.example.org' } as any;
		await listGraphs.handler(connection);
		expect(mockExecuteBackgroundQuery).toHaveBeenCalledWith(connection, queryText, 'List Graphs');
	});
});

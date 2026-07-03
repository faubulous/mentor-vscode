import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { mockExecuteBackgroundQuery, mockGetQueryTemplate } = vi.hoisted(() => ({
	mockExecuteBackgroundQuery: vi.fn(async () => {}),
	mockGetQueryTemplate: vi.fn((_conn: any, _kind: string) => undefined as string | undefined),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlResultsController') {
				return { executeBackgroundQuery: mockExecuteBackgroundQuery };
			}
			if (token === 'SparqlConnectionService') {
				return { getQueryTemplate: mockGetQueryTemplate };
			}
			if (token === 'GraphManagementService') {
				return { hasGraphsForConnection: () => false, getGraphsForConnection: () => [] };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { listGraphs } from '@src/commands/list-graphs';

beforeEach(() => {
	vi.clearAllMocks();
	mockGetQueryTemplate.mockReturnValue(undefined);
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
});

describe('listGraphs command', () => {
	it('should have correct id', () => {
		expect(listGraphs.id).toBe('mentor.command.listGraphs');
	});

	it('should show error when no query can be resolved', async () => {
		await listGraphs.handler({ id: 'conn-1', endpointUrl: 'http://sparql.example.org' } as any);
		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
	});

	it('should execute background query with the resolved template', async () => {
		const queryText = 'SELECT DISTINCT ?g WHERE { GRAPH ?g {} }';
		mockGetQueryTemplate.mockReturnValue(queryText);
		const connection = { id: 'conn-1', endpointUrl: 'http://sparql.example.org' } as any;
		await listGraphs.handler(connection);
		expect(mockGetQueryTemplate).toHaveBeenCalledWith(connection, 'listGraphs');
		expect(mockExecuteBackgroundQuery).toHaveBeenCalledWith(connection, queryText, 'List Graphs');
	});
});

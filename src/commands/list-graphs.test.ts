import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { mockSetQuerySourceForDocument, mockExecuteQueryFromTextDocument, mockGetConfig } = vi.hoisted(() => ({
	mockSetQuerySourceForDocument: vi.fn(async () => {}),
	mockExecuteQueryFromTextDocument: vi.fn(async () => {}),
	mockGetConfig: vi.fn(() => ({ get: (_k: string, d?: any) => d })),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionService') {
				return {
					getConnectionForDocument: vi.fn(() => undefined),
					setQuerySourceForDocument: mockSetQuerySourceForDocument,
					getConnections: vi.fn(() => []),
				};
			}
			if (token === 'SparqlResultsController') {
				return { executeQueryFromTextDocument: mockExecuteQueryFromTextDocument };
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
import { listGraphs } from './list-graphs';

beforeEach(() => {
	vi.clearAllMocks();
	mockGetConfig.mockImplementation(() => ({ get: (_k: string, d?: any) => d }));
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);
	(vscode.workspace as any).openTextDocument = vi.fn(async () => ({ uri: vscode.Uri.parse('untitled:query') }));
});

describe('listGraphs command', () => {
	it('should have correct id', () => {
		expect(listGraphs.id).toBe('mentor.command.listGraphs');
	});

	it('should show error when no query is configured', async () => {
		await listGraphs.handler({ id: 'conn-1', endpointUrl: 'http://sparql.example.org' } as any);
		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
	});

	it('should open document, set connection and execute query when query is configured', async () => {
		mockGetConfig.mockImplementation(() => ({
			get: (k: string, d?: any) => k === 'sparql.listGraphsQuery' ? 'SELECT DISTINCT ?g WHERE { GRAPH ?g {} }' : d,
		}));
		const connection = { id: 'conn-1', endpointUrl: 'http://sparql.example.org' } as any;
		await listGraphs.handler(connection);
		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
			content: 'SELECT DISTINCT ?g WHERE { GRAPH ?g {} }',
			language: 'sparql',
		});
		expect(mockSetQuerySourceForDocument).toHaveBeenCalledWith(expect.anything(), 'conn-1');
		expect(mockExecuteQueryFromTextDocument).toHaveBeenCalled();
	});
});

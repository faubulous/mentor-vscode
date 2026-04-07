import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockGetConnectionForDocument: Mock;
let mockDeleteGraphs: Mock;

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
					getConnectionForDocument: (...args: any[]) => mockGetConnectionForDocument(...args),
					setQuerySourceForDocument: mockSetQuerySourceForDocument,
					getConnections: vi.fn(() => []),
				};
			}
			if (token === 'Store') {
				return { deleteGraphs: (...args: any[]) => mockDeleteGraphs(...args) };
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
import { deleteGraph } from './delete-graph';

beforeEach(() => {
	mockGetConnectionForDocument = vi.fn(() => undefined);
	mockDeleteGraphs = vi.fn();
	mockGetConfig.mockImplementation(() => ({ get: (_k: string, d?: any) => d }));
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);
	(vscode.workspace as any).openTextDocument = vi.fn(async () => ({ uri: vscode.Uri.parse('untitled:query') }));
});

describe('deleteGraph command', () => {
	it('should have correct id', () => {
		expect(deleteGraph.id).toBe('mentor.command.deleteGraph');
	});

	it('should do nothing when user cancels confirmation', async () => {
		(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
		await deleteGraph.handler('http://example.org/doc', 'http://example.org/graph');
		expect(mockDeleteGraphs).not.toHaveBeenCalled();
	});

	it('should show error when no connection found after confirmation', async () => {
		(vscode.window as any).showWarningMessage = vi.fn(async () => 'Delete');
		mockGetConnectionForDocument.mockReturnValue(undefined);
		await deleteGraph.handler('http://example.org/doc', 'http://example.org/graph');
		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
	});

	it('should call store.deleteGraphs for workspace connection', async () => {
		(vscode.window as any).showWarningMessage = vi.fn(async () => 'Delete');
		mockGetConnectionForDocument.mockReturnValue({ id: 'workspace' });
		const graphIri = vscode.Uri.parse('http://example.org/graph');
		await deleteGraph.handler('http://example.org/doc', graphIri);
		expect(mockDeleteGraphs).toHaveBeenCalledWith([graphIri.toString(true)]);
	});

	it('should show error when no drop graph query is configured for remote connection', async () => {
		(vscode.window as any).showWarningMessage = vi.fn(async () => 'Delete');
		mockGetConnectionForDocument.mockReturnValue({ id: 'remote', endpointUrl: 'http://sparql.example.org' });
		await deleteGraph.handler('http://example.org/doc', 'http://example.org/graph');
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			expect.stringContaining('mentor.sparql.dropGraphQuery')
		);
	});

	it('should open document and execute drop graph query for remote connection', async () => {
		(vscode.window as any).showWarningMessage = vi.fn(async () => 'Delete');
		mockGetConnectionForDocument.mockReturnValue({ id: 'remote', endpointUrl: 'http://sparql.example.org' });
		mockGetConfig.mockImplementation(() => ({
			get: (k: string, d?: any) => k === 'sparql.dropGraphQuery' ? 'DROP GRAPH <@graphIri>' : d,
		}));
		await deleteGraph.handler('http://example.org/doc', 'http://example.org/graph');
		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'DROP GRAPH <http://example.org/graph>', language: 'sparql' })
		);
		expect(mockSetQuerySourceForDocument).toHaveBeenCalled();
		expect(vscode.window.showTextDocument).toHaveBeenCalled();
		expect(mockExecuteQueryFromTextDocument).toHaveBeenCalled();
	});
});

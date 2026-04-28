import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockExecuteQueryOnConnection: Mock;

const { MENTOR_WORKSPACE_STORE } = vi.hoisted(() => ({
	MENTOR_WORKSPACE_STORE: { id: 'workspace', endpointUrl: 'workspace' },
}));

vi.mock('@src/languages/sparql/services/sparql-connection-service', () => ({
	MENTOR_WORKSPACE_STORE,
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlQueryService') {
				return {
					executeQueryOnConnection: (...args: any[]) => mockExecuteQueryOnConnection(...args),
				};
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { openGraph } from './open-graph';

beforeEach(() => {
	mockExecuteQueryOnConnection = vi.fn(async () => ({
		type: 'bindings',
		bindings: [{ get: (_k: string) => ({ value: '5' }) }],
	}));
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.window as any).showInformationMessage = vi.fn(async () => undefined);
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);
	(vscode.window as any).withProgress = vi.fn(async (_opts: any, task: any) => {
		await task({ report: vi.fn() }, { isCancellationRequested: false });
	});
	(vscode.workspace as any).openTextDocument = vi.fn(async () => ({
		uri: vscode.Uri.parse('untitled:result'),
	}));
});

describe('openGraph command', () => {
	it('should have correct id', () => {
		expect(openGraph.id).toBe('mentor.command.openGraph');
	});

	it('should export graph with turtle document when count < threshold', async () => {
		// First call: count query returns count < 10000
		mockExecuteQueryOnConnection
			.mockResolvedValueOnce({
				type: 'bindings',
				bindings: [{ get: (_k: string) => ({ value: '100' }) }],
			})
			// Second call: CONSTRUCT query returns quads result
			.mockResolvedValueOnce({
				type: 'quads',
				data: '@prefix ex: <http://example.org/> . ex:s ex:p ex:o .',
			});

		await openGraph.handler('http://example.org/graph');
		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({ language: 'turtle' })
		);
		expect(vscode.window.showTextDocument).toHaveBeenCalled();
	});

	it('should show information message when graph is empty', async () => {
		// Count query returns some
		mockExecuteQueryOnConnection
			.mockResolvedValueOnce({
				type: 'bindings',
				bindings: [{ get: (_k: string) => ({ value: '5' }) }],
			})
			// CONSTRUCT result is null-ish
			.mockResolvedValueOnce({ type: 'quads', data: null });

		await openGraph.handler('http://example.org/graph');
		expect(vscode.window.showInformationMessage).toHaveBeenCalled();
	});

	it('should show warning when graph has more than threshold triples', async () => {
		// Count query returns threshold (10000)
		mockExecuteQueryOnConnection.mockResolvedValueOnce({
			type: 'bindings',
			bindings: [{ get: (_k: string) => ({ value: '10000' }) }],
		});
		// User cancels
		(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);

		await openGraph.handler('http://example.org/graph');
		expect(vscode.window.showWarningMessage).toHaveBeenCalled();
	});

	it('should proceed when user confirms large graph export', async () => {
		mockExecuteQueryOnConnection
			.mockResolvedValueOnce({
				type: 'bindings',
				bindings: [{ get: (_k: string) => ({ value: '10000' }) }],
			})
			.mockResolvedValueOnce({
				type: 'quads',
				data: '@prefix ex: <http://example.org/> . ex:s ex:p ex:o .',
			});
		(vscode.window as any).showWarningMessage = vi.fn(async () => 'Continue');

		await openGraph.handler('http://example.org/graph');
		expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
	});

	it('should show error when query throws', async () => {
		mockExecuteQueryOnConnection.mockRejectedValue(new Error('Query failed'));
		await openGraph.handler('http://example.org/graph');
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			expect.stringContaining('Failed to serialize graph'),
			'Edit Query'
		);
	});

	it('should open a new SPARQL editor with the CONSTRUCT query when Edit Query is clicked on error', async () => {
		mockExecuteQueryOnConnection.mockRejectedValue(new Error('Query failed'));
		(vscode.window as any).showErrorMessage = vi.fn(async () => 'Edit Query');
		(vscode.commands as any).executeCommand = vi.fn(async () => undefined);

		await openGraph.handler('http://example.org/graph');

		expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
			'mentor.command.openDocument',
			'',
			expect.stringContaining('CONSTRUCT')
		);
	});

	it('should use provided connection when given', async () => {
		const customConn = { id: 'custom', endpointUrl: 'http://custom.example.org' } as any;
		mockExecuteQueryOnConnection
			.mockResolvedValueOnce({
				type: 'bindings',
				bindings: [{ get: (_k: string) => ({ value: '5' }) }],
			})
			.mockResolvedValueOnce({ type: 'quads', data: 'turtle data' });
		await openGraph.handler('http://example.org/graph', customConn);
		expect(mockExecuteQueryOnConnection).toHaveBeenCalledWith(
			expect.stringContaining('CONSTRUCT'),
			customConn
		);
	});
});

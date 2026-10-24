import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('@src/languages/sparql/services/sparql-connection-registry', () => ({
	WORKSPACE_CONNECTION: { id: 'workspace' },
}));

let history: any[];
let connections: any[];
let graphs: Record<string, string[]>;
let graphErrors: Record<string, string | undefined>;
let workspaceGraphs: string[];
let mockGetConnection: Mock;
let mockGetConnectionForDocument: Mock;
let mockSetQuerySource: Mock;
let mockTestConnection: Mock;
let historyChangeHandler: (() => void) | undefined;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === ServiceToken.ExtensionContext) {
				return { subscriptions: [] };
			}
			if (token === ServiceToken.SparqlQueryService) {
				return {
					onDidHistoryChange: vi.fn((cb: () => void) => { historyChangeHandler = cb; return { dispose: () => {} }; }),
					getQueryHistory: () => history,
				};
			}
			if (token === ServiceToken.SparqlConnectionRegistry || token === ServiceToken.DocumentConnectionService) {
				return {
					onDidChangeConnections: vi.fn(() => ({ dispose: () => {} })),
					getConnections: () => connections,
					getConnection: (...args: any[]) => mockGetConnection(...args),
					getConnectionForDocument: (...args: any[]) => mockGetConnectionForDocument(...args),
					setQuerySourceForDocument: (...args: any[]) => mockSetQuerySource(...args),
				};
			}
			if (token === ServiceToken.GraphManagementService) {
				return {
					onDidGraphLoadStart: vi.fn(() => ({ dispose: () => {} })),
					onDidGraphLoadEnd: vi.fn(() => ({ dispose: () => {} })),
					onDidChangeGraphs: vi.fn(() => ({ dispose: () => {} })),
					hasGraphsForConnection: (id: string) => graphs[id] !== undefined,
					getGraphsForConnection: (id: string) => graphs[id] ?? [],
					getGraphLoadError: (id: string) => graphErrors[id],
					getWorkspaceGraphs: () => workspaceGraphs,
				};
			}
			if (token === ServiceToken.SparqlEndpointTester) {
				return {
					testConnection: (...args: any[]) => mockTestConnection(...args),
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
import { SparqlResultsController } from '@src/views/webviews/views/sparql-results/sparql-results-controller';
import { ServiceToken } from '@src/services/tokens';

function makeController() {
	const controller = new SparqlResultsController();
	// Avoid depending on webview wiring; capture posted messages instead.
	(controller as any).postMessage = vi.fn();
	return controller;
}

beforeEach(() => {
	history = [];
	connections = [];
	graphs = {};
	graphErrors = {};
	workspaceGraphs = [];
	mockGetConnection = vi.fn(() => ({ id: 'conn-1' }));
	mockGetConnectionForDocument = vi.fn(() => ({ id: 'conn-1' }));
	mockSetQuerySource = vi.fn(async () => undefined);
	mockTestConnection = vi.fn(async () => null);
	historyChangeHandler = undefined;
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);
	(vscode.window as any).registerWebviewViewProvider = vi.fn(() => ({ dispose: () => {} }));
	(vscode.workspace as any).openTextDocument = vi.fn(async (opts: any) => ({
		uri: vscode.Uri.parse('untitled:rendered'),
		languageId: opts.language,
	}));
});

describe('SparqlResultsController EditBackgroundQuery handler', () => {
	it('opens a generated query as text and inherits the connection from its source document', async () => {
		history = [{ id: 'q1', query: 'SELECT * WHERE {}', documentIri: 'file:///template.sparql', generated: true }];

		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'EditBackgroundQuery', queryId: 'q1' });

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({ content: 'SELECT * WHERE {}', language: 'sparql' })
		);
		// Connection resolved from the template document, not from a connectionId.
		expect(mockGetConnectionForDocument).toHaveBeenCalled();
		expect(mockSetQuerySource).toHaveBeenCalledWith(expect.anything(), 'conn-1');
		expect((controller as any).postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'UpdateQueryDocumentIri', queryId: 'q1' })
		);
		expect(vscode.window.showTextDocument).toHaveBeenCalled();
	});

	it('opens a background query as text and inherits the connection from its connectionId', async () => {
		history = [{ id: 'q2', query: 'SELECT 1', connectionId: 'conn-1' }];

		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'EditBackgroundQuery', queryId: 'q2' });

		expect(mockGetConnection).toHaveBeenCalledWith('conn-1');
		expect(mockSetQuerySource).toHaveBeenCalledWith(expect.anything(), 'conn-1');
	});

	it('does not set a query source when the connection is the workspace store', async () => {
		history = [{ id: 'q3', query: 'SELECT 1', documentIri: 'file:///template.sparql', generated: true }];
		mockGetConnectionForDocument = vi.fn(() => ({ id: 'workspace' }));

		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'EditBackgroundQuery', queryId: 'q3' });

		expect(mockSetQuerySource).not.toHaveBeenCalled();
		expect(vscode.window.showTextDocument).toHaveBeenCalled();
	});

	it('does nothing when the query has no text', async () => {
		history = [{ id: 'q4', documentIri: 'file:///template.sparql' }];

		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'EditBackgroundQuery', queryId: 'q4' });

		expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
		expect(mockSetQuerySource).not.toHaveBeenCalled();
	});
});

describe('SparqlResultsController query history', () => {
	it('carries no select id when the history is posted with no execution in flight (e.g. welcome refresh)', async () => {
		history = [{ id: 'q1', documentIri: 'file:///a.sparql' }];

		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'GetSparqlQueryHistory' });

		expect((controller as any).postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'PostSparqlQueryHistory', selectQueryId: undefined })
		);
	});

	it('carries the executing query id on every history post so the panel selects its tab', async () => {
		history = [{ id: 'q1', documentIri: 'file:///a.sparql' }];

		const controller = makeController();

		// Simulate an execution in flight (set by _executeQuery around the query run).
		(controller as any)._pendingSelectQueryId = 'q1';

		// Both an execution-driven push (onDidHistoryChange) and the webview's mount pull
		// (GetSparqlQueryHistory) must carry the pending id.
		historyChangeHandler?.();
		await (controller as any).onDidReceiveMessage({ id: 'GetSparqlQueryHistory' });

		const posts = (controller as any).postMessage.mock.calls
			.map((c: any[]) => c[0])
			.filter((m: any) => m.id === 'PostSparqlQueryHistory');

		expect(posts.length).toBeGreaterThanOrEqual(2);
		expect(posts.every((m: any) => m.selectQueryId === 'q1')).toBe(true);
	});

	const bindingsResult = { type: 'bindings', columns: [], rows: [], namespaceMap: {} };
	const rawResponse = { url: 'http://example.org/sparql', status: 200, statusText: 'OK', body: 'x' };

	function lastHistoryPost(controller: SparqlResultsController): any {
		return (controller as any).postMessage.mock.calls.at(-1)[0];
	}

	it('posts the result of the most recent query only, and never a raw response', () => {
		history = [
			{ id: 'q1', documentIri: 'file:///a.sparql', result: bindingsResult, rawResponse },
			{ id: 'q2', documentIri: 'file:///b.sparql', result: bindingsResult, rawResponse },
		];

		const controller = makeController();

		historyChangeHandler?.();

		const message = lastHistoryPost(controller);

		expect(message.id).toBe('PostSparqlQueryHistory');
		expect(message.history[0].result).toBe(bindingsResult);
		expect(message.history[1].result).toBeUndefined();
		expect(message.history[1].documentIri).toBe('file:///b.sparql');
		expect(message.history.every((entry: any) => entry.rawResponse === undefined)).toBe(true);
	});

	it('posts the result of the query being executed even when it is not the most recent', () => {
		history = [
			{ id: 'q1', documentIri: 'file:///a.sparql', result: bindingsResult, rawResponse },
			{ id: 'q2', documentIri: 'file:///b.sparql', result: bindingsResult, rawResponse },
		];

		const controller = makeController();

		(controller as any)._pendingSelectQueryId = 'q2';
		historyChangeHandler?.();

		const message = lastHistoryPost(controller);

		expect(message.history[1].result).toBe(bindingsResult);
		expect(message.history[1].rawResponse).toBeUndefined();
	});

	it('defers execution until a just-opened webview reports it is listening', async () => {
		const controller = makeController();

		// Panel just opened: readiness is armed but not yet signaled.
		(controller as any)._armWebviewReady();

		let ready = false;
		const wait = (controller as any)._awaitWebviewReady(5000).then(() => { ready = true; });

		await Promise.resolve();
		expect(ready).toBe(false);

		// The webview's first history request doubles as its readiness signal.
		await (controller as any).onDidReceiveMessage({ id: 'GetSparqlQueryHistory' });
		await wait;

		expect(ready).toBe(true);
	});

	it('does not wait for readiness when the panel was already open', async () => {
		const controller = makeController();

		// No readiness armed (panel already visible) — resolves immediately.
		await (controller as any)._awaitWebviewReady(5000);
	});
});

describe('SparqlResultsController connection handlers', () => {
	it('posts the connections with cached graph statuses', async () => {
		connections = [{ id: 'workspace' }, { id: 'conn-1' }, { id: 'conn-2' }];
		graphs = { 'conn-1': ['urn:g1', 'urn:g2'] };
		graphErrors = { 'conn-2': 'timeout' };
		workspaceGraphs = ['urn:w1'];

		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'GetSparqlConnections' });

		expect((controller as any).postMessage).toHaveBeenCalledWith({
			id: 'PostSparqlConnections',
			connections,
			statuses: {
				'workspace': { count: 1 },
				'conn-1': { count: 2 },
				'conn-2': { count: 0, error: 'timeout' },
			},
		});
	});

	it('posts a successful test result when the endpoint test passes', async () => {
		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'TestSparqlConnection', connection: { id: 'conn-1' } });

		expect((controller as any).postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'TestSparqlConnectionResult', connectionId: 'conn-1', success: true })
		);
	});

	it('posts the test error when the endpoint test fails', async () => {
		mockTestConnection = vi.fn(async () => ({ code: 401, message: 'Unauthorized' }));

		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'TestSparqlConnection', connection: { id: 'conn-1' } });

		expect((controller as any).postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'TestSparqlConnectionResult', connectionId: 'conn-1', success: false, error: 'Unauthorized' })
		);
	});

	it('lists graphs via the listGraphs command after a passing test', async () => {
		(vscode.commands as any).executeCommand = vi.fn(async () => undefined);

		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'ListSparqlConnectionGraphs', connection: { id: 'conn-1' } });

		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mentor.command.listGraphs', { id: 'conn-1' });
	});

	it('reports a failing test instead of listing graphs', async () => {
		mockTestConnection = vi.fn(async () => ({ code: 0, message: 'Connection refused' }));
		(vscode.commands as any).executeCommand = vi.fn(async () => undefined);

		const controller = makeController();
		await (controller as any).onDidReceiveMessage({ id: 'ListSparqlConnectionGraphs', connection: { id: 'conn-1' } });

		expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
		expect((controller as any).postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'TestSparqlConnectionResult', connectionId: 'conn-1', success: false, error: 'Connection refused' })
		);
	});
});

describe('SparqlResultsController GetSparqlQueryResult handler', () => {
	/**
	 * Sends a result request for the given query id and returns the posted reply.
	 */
	async function requestQueryResult(queryId: string) {
		const controller = makeController();

		await (controller as any).onDidReceiveMessage({ id: 'GetSparqlQueryResult', queryId });

		expect((controller as any).postMessage).toHaveBeenCalledTimes(1);

		return (controller as any).postMessage.mock.calls[0][0];
	}

	it('replies with the cached execution state of a known query, without the raw response', async () => {
		const result = { type: 'bindings', columns: ['s'], rows: [] };

		history = [
			{ id: 'q2', documentIri: 'file:///b.sparql', startTime: 2, endTime: 3 },
			{ id: 'q1', documentIri: 'file:///a.sparql', startTime: 0, endTime: 1, result, rawResponse: { body: '{}' } },
		];

		const reply = await requestQueryResult('q1');

		expect(reply.id).toBe('PostSparqlQueryResult');
		expect(reply.queryId).toBe('q1');
		expect(reply.queryState).toEqual(expect.objectContaining({ id: 'q1', documentIri: 'file:///a.sparql', result }));
		expect(reply.queryState.rawResponse).toBeUndefined();

		// The history entry itself keeps its raw response for the "view raw response" command.
		expect(history[1].rawResponse).toEqual({ body: '{}' });
	});

	it('replies without a state when the query is no longer in the history', async () => {
		history = [{ id: 'q1', documentIri: 'file:///a.sparql', startTime: 0 }];

		const reply = await requestQueryResult('unknown');

		expect(reply).toEqual({ id: 'PostSparqlQueryResult', queryId: 'unknown', queryState: undefined });
	});
});

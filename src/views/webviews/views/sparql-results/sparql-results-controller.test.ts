import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('@src/languages/sparql/services/sparql-connection-registry', () => ({
	WORKSPACE_CONNECTION: { id: 'workspace' },
}));

let history: any[];
let mockGetConnection: Mock;
let mockGetConnectionForDocument: Mock;
let mockSetQuerySource: Mock;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') {
				return { subscriptions: [] };
			}
			if (token === 'SparqlQueryService') {
				return {
					onDidHistoryChange: vi.fn(() => ({ dispose: () => {} })),
					getQueryHistory: () => history,
				};
			}
			if (token === 'SparqlConnectionRegistry' || token === 'DocumentConnectionService') {
				return {
					getConnection: (...args: any[]) => mockGetConnection(...args),
					getConnectionForDocument: (...args: any[]) => mockGetConnectionForDocument(...args),
					setQuerySourceForDocument: (...args: any[]) => mockSetQuerySource(...args),
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

function makeController() {
	const controller = new SparqlResultsController();
	// Avoid depending on webview wiring; capture posted messages instead.
	(controller as any).postMessage = vi.fn();
	return controller;
}

beforeEach(() => {
	history = [];
	mockGetConnection = vi.fn(() => ({ id: 'conn-1' }));
	mockGetConnectionForDocument = vi.fn(() => ({ id: 'conn-1' }));
	mockSetQuerySource = vi.fn(async () => undefined);
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

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockExecuteQuery: Mock;
let mockSetQuerySource: Mock;
let mockGetConnectionForDocument: Mock;

vi.mock('@src/languages/sparql/services/sparql-connection-service', () => ({
	WORKSPACE_CONNECTION: { id: 'workspace' },
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionService') {
				return {
					getConnectionForDocument: (...args: any[]) => mockGetConnectionForDocument(...args),
					setQuerySourceForDocument: (...args: any[]) => mockSetQuerySource(...args),
				};
			}
			if (token === 'SparqlResultsController') {
				return { executeQuery: (...args: any[]) => mockExecuteQuery(...args) };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { openRenderedTriplate } from '@src/commands/open-rendered-triplate';

function registerDoc(uri: string, languageId: string) {
	const document = { uri: vscode.Uri.parse(uri), languageId, getText: () => '' };
	(vscode.workspace as any).textDocuments = [document];
	return document;
}

beforeEach(() => {
	mockExecuteQuery = vi.fn(async () => undefined);
	mockSetQuerySource = vi.fn(async () => undefined);
	mockGetConnectionForDocument = vi.fn(() => ({ id: 'conn-1' }));
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);
	(vscode.workspace as any).openTextDocument = vi.fn(async (opts: any) => ({
		uri: vscode.Uri.parse('untitled:rendered'),
		languageId: opts.language,
	}));
});

describe('openRenderedTriplate command', () => {
	it('has the correct id', () => {
		expect(openRenderedTriplate.id).toBe('mentor.command.openRenderedTriplate');
	});

	it('opens the rendered SPARQL, inherits the source connection, and executes it', async () => {
		registerDoc('file:///q.sparql', 'sparql');

		await openRenderedTriplate.handler('file:///q.sparql', 'SELECT * WHERE {}');

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(expect.objectContaining({ language: 'sparql' }));
		expect(mockSetQuerySource).toHaveBeenCalled();
		expect(mockExecuteQuery).toHaveBeenCalled();
	});

	it('does not inherit the connection when the source uses the workspace store', async () => {
		mockGetConnectionForDocument = vi.fn(() => ({ id: 'workspace' }));
		registerDoc('file:///q.sparql', 'sparql');

		await openRenderedTriplate.handler('file:///q.sparql', 'SELECT * WHERE {}');

		expect(mockSetQuerySource).not.toHaveBeenCalled();
		expect(mockExecuteQuery).toHaveBeenCalled();
	});

	it('opens a non-SPARQL rendered document without executing', async () => {
		registerDoc('file:///d.ttl', 'turtle');

		await openRenderedTriplate.handler('file:///d.ttl', '<urn:s> a <urn:o> .');

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(expect.objectContaining({ language: 'turtle' }));
		expect(mockExecuteQuery).not.toHaveBeenCalled();
	});

	it('warns when the source document cannot be resolved', async () => {
		(vscode.workspace as any).textDocuments = [];

		await openRenderedTriplate.handler('file:///missing.sparql', 'SELECT 1');

		expect(vscode.window.showWarningMessage).toHaveBeenCalled();
		expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
	});
});

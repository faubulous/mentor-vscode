import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockPanelExecuteQuery: Mock;
let mockCellExecuteQuery: Mock;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlResultsController') {
				return { executeQuery: (...args: any[]) => mockPanelExecuteQuery(...args) };
			}
			if (token === 'NotebookController') {
				return { executeQueryInCell: (...args: any[]) => mockCellExecuteQuery(...args) };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { executeSparqlQueryFromString } from '@src/commands/execute-sparql-query-from-string';

beforeEach(() => {
	mockPanelExecuteQuery = vi.fn(async () => undefined);
	mockCellExecuteQuery = vi.fn(async () => undefined);
	(vscode.workspace as any).textDocuments = [];
	(vscode.workspace as any).notebookDocuments = [];
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).activeTextEditor = undefined;
});

describe('executeSparqlQueryFromString command', () => {
	it('has the correct id', () => {
		expect(executeSparqlQueryFromString.id).toBe('mentor.command.executeSparqlQueryFromString');
	});

	it('runs the query in the results panel for an editor document context', async () => {
		const document = { uri: vscode.Uri.parse('file:///q.sparql'), languageId: 'sparql', getText: () => '' };
		(vscode.workspace as any).textDocuments = [document];

		await executeSparqlQueryFromString.handler('SELECT * WHERE {}', 'file:///q.sparql');

		expect(mockPanelExecuteQuery).toHaveBeenCalledWith(document, 'SELECT * WHERE {}');
		expect(mockCellExecuteQuery).not.toHaveBeenCalled();
	});

	it('runs the query in the cell output for a notebook cell context', async () => {
		const uri = vscode.Uri.parse('vscode-notebook-cell:///nb#c1');
		const cell = {
			notebook: {},
			document: { uri, languageId: 'sparql', getText: () => '' },
		};
		(vscode.workspace as any).notebookDocuments = [{ getCells: () => [cell] }];

		await executeSparqlQueryFromString.handler('SELECT * WHERE {}', uri.toString());

		expect(mockCellExecuteQuery).toHaveBeenCalledWith(cell, 'SELECT * WHERE {}');
		expect(mockPanelExecuteQuery).not.toHaveBeenCalled();
	});

	it('warns when no document context can be resolved', async () => {
		await executeSparqlQueryFromString.handler('SELECT 1', 'file:///missing.sparql');

		expect(vscode.window.showWarningMessage).toHaveBeenCalled();
		expect(mockPanelExecuteQuery).not.toHaveBeenCalled();
		expect(mockCellExecuteQuery).not.toHaveBeenCalled();
	});
});

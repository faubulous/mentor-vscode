import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockSparqlResultsController } = vi.hoisted(() => ({
	mockSparqlResultsController: {
		executeQueryFromTextDocument: vi.fn(),
	}
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlResultsController') return mockSparqlResultsController;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { executeSparqlQueryFromActiveEditor } from '@src/commands/execute-sparql-query-from-active-editor';

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.window as any).activeTextEditor = undefined;
});

afterEach(() => {
	(vscode.window as any).activeTextEditor = undefined;
});

describe('executeSparqlQueryFromActiveEditor', () => {
	it('should have the correct command id', () => {
		expect(executeSparqlQueryFromActiveEditor.id).toBe('mentor.command.executeSparqlQueryFromActiveEditor');
	});

	it('should show an error message when no active editor', async () => {
		const showError = vi.spyOn(vscode.window, 'showErrorMessage');
		await executeSparqlQueryFromActiveEditor.handler();
		expect(showError).toHaveBeenCalled();
		expect(mockSparqlResultsController.executeQueryFromTextDocument).not.toHaveBeenCalled();
	});

	it('should execute from document when active editor exists', async () => {
		const fakeDoc = { uri: vscode.Uri.parse('file:///q.sparql') };
		(vscode.window as any).activeTextEditor = { document: fakeDoc };

		await executeSparqlQueryFromActiveEditor.handler();

		expect(mockSparqlResultsController.executeQueryFromTextDocument).toHaveBeenCalledWith(fakeDoc);
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

const { mockExecuteNotebookCellHandler } = vi.hoisted(() => ({
	mockExecuteNotebookCellHandler: vi.fn(async () => undefined),
}));

vi.mock('./execute-notebook-cell', () => ({
	executeNotebookCell: {
		id: 'mentor.command.executeNotebookCell',
		handler: mockExecuteNotebookCellHandler,
	},
}));

const mockSparqlResultsController = {
	executeQueryFromTextDocument: vi.fn(async () => undefined),
};

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

import { executeSparqlQuery } from './execute-sparql-query';

describe('executeSparqlQuery', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(vscode.workspace as any).textDocuments = [];
	});

	it('has the correct id', () => {
		expect(executeSparqlQuery.id).toBe('mentor.command.executeSparqlQuery');
	});

	it('delegates to executeNotebookCell when notebookIri and cellIndex are set', async () => {
		const query = { notebookIri: 'file:///test.sparqlbook', cellIndex: 0 } as any;
		await executeSparqlQuery.handler(query);
		expect(mockExecuteNotebookCellHandler).toHaveBeenCalledWith('file:///test.sparqlbook', 0);
	});

	it('executes from text document when documentIri is set', async () => {
		const mockDoc = { uri: vscode.Uri.parse('file:///test.sparql'), getText: () => 'SELECT * WHERE {}' };
		(vscode.workspace as any).textDocuments = [mockDoc];
		const query = { documentIri: 'file:///test.sparql' } as any;
		await executeSparqlQuery.handler(query);
		expect(mockSparqlResultsController.executeQueryFromTextDocument).toHaveBeenCalledWith(mockDoc);
	});

	it('throws when documentIri is set but document not found', async () => {
		(vscode.workspace as any).textDocuments = [];
		const query = { documentIri: 'file:///missing.sparql' } as any;
		await expect(executeSparqlQuery.handler(query)).rejects.toThrow('Document with IRI file:///missing.sparql not found.');
	});

	it('does nothing when query has no notebookIri or documentIri', async () => {
		const query = {} as any;
		await executeSparqlQuery.handler(query);
		expect(mockExecuteNotebookCellHandler).not.toHaveBeenCalled();
		expect(mockSparqlResultsController.executeQueryFromTextDocument).not.toHaveBeenCalled();
	});
});

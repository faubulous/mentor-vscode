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
import { executeSparqlQueryFromDocument } from '@src/commands/execute-sparql-query-from-document';

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.workspace as any).textDocuments = [];
});

afterEach(() => {
	(vscode.workspace as any).textDocuments = [];
});

describe('executeSparqlQueryFromDocument', () => {
	it('should have the correct command id', () => {
		expect(executeSparqlQueryFromDocument.id).toBe('mentor.command.executeSparqlQueryFromDocument');
	});

	it('should throw when document is not found', async () => {
		await expect(executeSparqlQueryFromDocument.handler('urn:missing')).rejects.toThrow();
		expect(mockSparqlResultsController.executeQueryFromTextDocument).not.toHaveBeenCalled();
	});

	it('should execute from document when found by IRI', async () => {
		const iri = 'file:///docs/query.sparql';
		const fakeDoc = { uri: { toString: () => iri } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeSparqlQueryFromDocument.handler(iri);

		expect(mockSparqlResultsController.executeQueryFromTextDocument).toHaveBeenCalledWith(fakeDoc);
	});
});

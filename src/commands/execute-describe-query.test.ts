import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('../utilities/mocks/vscode'));

const { mockSparqlResultsController, mockConnectionService } = vi.hoisted(() => ({
	mockSparqlResultsController: {
		executeQueryFromTextDocument: vi.fn(async () => undefined),
	},
	mockConnectionService: {
		getConnectionForDocument: vi.fn(() => ({ id: 'workspace' })),
		setQuerySourceForDocument: vi.fn(async () => undefined),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlResultsController') return mockSparqlResultsController;
			if (token === 'SparqlConnectionService') return mockConnectionService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { executeDescribeQuery } from './execute-describe-query';

const DESCRIBE_TEMPLATE = 'CONSTRUCT { <{{resourceIri}}> ?p ?o }\n{{fromClauses}}\nWHERE { <{{resourceIri}}> ?p ?o }';

function mockDescribeTemplate(template: string = DESCRIBE_TEMPLATE) {
	vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
		get: (key: string, defaultValue?: any) => key === 'sparql.describeQueryTemplate' ? template : defaultValue,
		has: () => true,
		inspect: () => undefined,
		update: async () => {}
	} as any);
}

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.workspace as any).textDocuments = [];

	const describeDoc = { uri: vscode.Uri.parse('untitled:describe') };
	(vscode.workspace as any).openTextDocument = vi.fn(async () => describeDoc);
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);

	mockConnectionService.getConnectionForDocument.mockReturnValue({ id: 'workspace' });
});

afterEach(() => {
	(vscode.workspace as any).textDocuments = [];
});

describe('executeDescribeQuery', () => {
	it('should have the correct command id', () => {
		expect(executeDescribeQuery.id).toBe('mentor.command.executeDescribeQuery');
	});

	it('should log a warning and return when document is not found', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const docUri = vscode.Uri.parse('file:///no-such.ttl');
		await executeDescribeQuery.handler(docUri, 'urn:ex#res');
		expect(warn).toHaveBeenCalled();
		expect(mockSparqlResultsController.executeQueryFromTextDocument).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('should open SPARQL document and execute when document is found', async () => {
		mockDescribeTemplate();

		const uriStr = 'file:///test.sparql';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res');

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({ language: 'sparql', content: expect.stringContaining('urn:ex#res') })
		);
		expect(vscode.window.showTextDocument).toHaveBeenCalled();
		expect(mockSparqlResultsController.executeQueryFromTextDocument).toHaveBeenCalled();
	});

	it('should set connection on the generated SPARQL document', async () => {
		mockDescribeTemplate();
		mockConnectionService.getConnectionForDocument.mockReturnValue({ id: 'my-conn' });

		const uriStr = 'file:///test.sparql';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res');

		expect(mockConnectionService.setQuerySourceForDocument).toHaveBeenCalledWith(
			expect.anything(),
			'my-conn'
		);
	});

	it('should build query from template without FROM clauses when graph URIs are not provided', async () => {
		mockDescribeTemplate();

		const uriStr = 'file:///test.sparql';
		(vscode.workspace as any).textDocuments = [{ uri: { toString: () => uriStr } }];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res');

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({
				content: 'CONSTRUCT { <urn:ex#res> ?p ?o }\n\nWHERE { <urn:ex#res> ?p ?o }',
				language: 'sparql',
			})
		);
	});

	it('should add one FROM clause when one graph URI is provided', async () => {
		mockDescribeTemplate();

		const uriStr = 'file:///test.sparql';
		(vscode.workspace as any).textDocuments = [{ uri: { toString: () => uriStr } }];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res', ['https://example.org/graph']);

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({
				content: 'CONSTRUCT { <urn:ex#res> ?p ?o }\nFROM <https://example.org/graph>\nWHERE { <urn:ex#res> ?p ?o }',
				language: 'sparql',
			})
		);
	});

	it('should add multiple FROM clauses for multiple graph URIs', async () => {
		mockDescribeTemplate();

		const uriStr = 'file:///test.sparql';
		(vscode.workspace as any).textDocuments = [{ uri: { toString: () => uriStr } }];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res', [
			'https://example.org/graph-a',
			'https://example.org/graph-b',
		]);

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({
				content: 'CONSTRUCT { <urn:ex#res> ?p ?o }\nFROM <https://example.org/graph-a>\nFROM <https://example.org/graph-b>\nWHERE { <urn:ex#res> ?p ?o }',
				language: 'sparql',
			})
		);
	});
});

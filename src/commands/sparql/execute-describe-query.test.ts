import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockQueryService, mockConnectionService } = vi.hoisted(() => ({
	mockQueryService: {
		executeQueryOnConnection: vi.fn<(...args: unknown[]) => Promise<{ type: string; data: string } | null>>(async () => ({ type: 'quads', data: '# result' })),
	},
	mockConnectionService: {
		getConnectionForDocument: vi.fn(() => ({ id: 'workspace' })),
		getInferenceEnabledForDocument: vi.fn(() => false),
		setQuerySourceForDocument: vi.fn(async () => undefined),
		getQueryTemplate: vi.fn((_conn: any, _kind: string) => undefined as string | undefined),
		getConnection: vi.fn((_id: string) => undefined as { id: string } | undefined),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlQueryService') return mockQueryService;
			if (token === 'SparqlConnectionRegistry' || token === 'DocumentConnectionService' || token === 'StoreConfigService') return mockConnectionService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { executeDescribeQuery } from '@src/commands/sparql/execute-describe-query';

const DESCRIBE_TEMPLATE = `---
params {
  resourceIri: iri
  graphIris:   iri[] optional
}
---
CONSTRUCT { \${resourceIri} ?p ?o }
{% for g in graphIris %}
FROM \${g}
{% endfor %}
WHERE { \${resourceIri} ?p ?o }`;

function mockDescribeTemplate(template: string = DESCRIBE_TEMPLATE) {
	mockConnectionService.getQueryTemplate.mockReturnValue(template);
}

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.workspace as any).textDocuments = [];

	const describeDoc = { uri: vscode.Uri.parse('untitled:describe') };
	(vscode.workspace as any).openTextDocument = vi.fn(async () => describeDoc);
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);

	mockConnectionService.getConnectionForDocument.mockReturnValue({ id: 'workspace' });
	mockConnectionService.getConnection.mockReturnValue(undefined);
	mockQueryService.executeQueryOnConnection.mockResolvedValue({ type: 'quads', data: '# result' });
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
		expect(mockQueryService.executeQueryOnConnection).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('should run the query against the document connection in the background', async () => {
		mockDescribeTemplate();
		const connection = { id: 'my-conn' };
		mockConnectionService.getConnectionForDocument.mockReturnValue(connection);
		mockConnectionService.getInferenceEnabledForDocument.mockReturnValue(true);

		const uriStr = 'file:///test.ttl';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res');

		expect(mockConnectionService.getConnectionForDocument).toHaveBeenCalledWith(fakeDoc.uri);
		expect(mockQueryService.executeQueryOnConnection).toHaveBeenCalledWith(
			expect.stringContaining('urn:ex#res'),
			connection,
			true
		);
	});

	it('should reuse the connection the query ran against when a connectionId is provided', async () => {
		mockDescribeTemplate();
		const queryConnection = { id: 'dbpedia' };
		mockConnectionService.getConnection.mockReturnValue(queryConnection);
		// The source document is configured for the workspace store, but the results came
		// from dbpedia; the describe must follow the connection the query actually used.
		mockConnectionService.getConnectionForDocument.mockReturnValue({ id: 'workspace' });

		const uriStr = 'file:///test.sparql';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res', undefined, 'dbpedia');

		expect(mockConnectionService.getConnection).toHaveBeenCalledWith('dbpedia');
		expect(mockConnectionService.getConnectionForDocument).not.toHaveBeenCalled();
		expect(mockQueryService.executeQueryOnConnection).toHaveBeenCalledWith(
			expect.stringContaining('urn:ex#res'),
			queryConnection,
			expect.anything()
		);
	});

	it('should describe against the connectionId even when the source document is not open', async () => {
		mockDescribeTemplate();
		const queryConnection = { id: 'dbpedia' };
		mockConnectionService.getConnection.mockReturnValue(queryConnection);
		(vscode.workspace as any).textDocuments = [];

		await executeDescribeQuery.handler('file:///not-open.sparql', 'urn:ex#res', undefined, 'dbpedia');

		expect(mockQueryService.executeQueryOnConnection).toHaveBeenCalledWith(
			expect.stringContaining('urn:ex#res'),
			queryConnection,
			undefined
		);
	});

	it('should open the result as a Turtle document without opening the results panel', async () => {
		mockDescribeTemplate();

		const uriStr = 'file:///test.ttl';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res');

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({ content: '# result', language: 'turtle' })
		);
		expect(vscode.window.showTextDocument).toHaveBeenCalled();
	});

	it('should not open a document when the query returns no quads', async () => {
		mockDescribeTemplate();
		mockQueryService.executeQueryOnConnection.mockResolvedValue(null);

		const uriStr = 'file:///test.ttl';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res');

		expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
		expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
	});

	it('should build query from template without FROM clauses when graph IRIs are not provided', async () => {
		mockDescribeTemplate();

		const uriStr = 'file:///test.ttl';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res');

		expect(mockQueryService.executeQueryOnConnection).toHaveBeenCalledWith(
			'CONSTRUCT { <urn:ex#res> ?p ?o }\nWHERE { <urn:ex#res> ?p ?o }',
			expect.anything(),
			expect.anything()
		);
	});

	it('should add one FROM clause when one graph IRI is provided', async () => {
		mockDescribeTemplate();

		const uriStr = 'file:///test.ttl';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res', ['https://example.org/graph']);

		expect(mockQueryService.executeQueryOnConnection).toHaveBeenCalledWith(
			'CONSTRUCT { <urn:ex#res> ?p ?o }\nFROM <https://example.org/graph>\nWHERE { <urn:ex#res> ?p ?o }',
			expect.anything(),
			expect.anything()
		);
	});

	it('should add multiple FROM clauses for multiple graph IRIs', async () => {
		mockDescribeTemplate();

		const uriStr = 'file:///test.ttl';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		await executeDescribeQuery.handler(vscode.Uri.parse(uriStr), 'urn:ex#res', [
			'https://example.org/graph-a',
			'https://example.org/graph-b',
		]);

		expect(mockQueryService.executeQueryOnConnection).toHaveBeenCalledWith(
			'CONSTRUCT { <urn:ex#res> ?p ?o }\nFROM <https://example.org/graph-a>\nFROM <https://example.org/graph-b>\nWHERE { <urn:ex#res> ?p ?o }',
			expect.anything(),
			expect.anything()
		);
	});
});

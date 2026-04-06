import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockSparqlResultsController } = vi.hoisted(() => ({
	mockSparqlResultsController: {
		executeQuery: vi.fn(),
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
import { executeDescribeQuery } from './execute-describe-query';

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.workspace as any).textDocuments = [];
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
		expect(mockSparqlResultsController.executeQuery).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('should execute the CONSTRUCT query when document is found', async () => {
		const uriStr = 'file:///test.sparql';
		const fakeDoc = { uri: { toString: () => uriStr } };
		(vscode.workspace as any).textDocuments = [fakeDoc];

		const docUri = vscode.Uri.parse(uriStr);
		await executeDescribeQuery.handler(docUri, 'urn:ex#res');

		expect(mockSparqlResultsController.executeQuery).toHaveBeenCalledWith(
			fakeDoc,
			expect.stringContaining('urn:ex#res')
		);
	});
});

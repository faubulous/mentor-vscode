import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { mockGetConfig } = vi.hoisted(() => ({
	mockGetConfig: vi.fn(() => ({ get: (_k: string, d?: any) => d })),
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: mockGetConfig,
}));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { createSparqlQueryFromDocument } from '@src/commands/create-sparql-query-from-document';

beforeEach(() => {
	vi.clearAllMocks();
	mockGetConfig.mockImplementation(() => ({ get: (_k: string, d?: any) => d }));
	(vscode.window as any).activeTextEditor = undefined;
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.workspace as any).openTextDocument = vi.fn(async () => ({
		uri: vscode.Uri.parse('untitled:result'),
	}));
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);
});

describe('createSparqlQueryFromDocument command', () => {
	it('should have correct id', () => {
		expect(createSparqlQueryFromDocument.id).toBe('mentor.command.createSparqlQueryFromDocument');
	});

	it('should show error when no active editor', async () => {
		(vscode.window as any).activeTextEditor = undefined;
		await createSparqlQueryFromDocument.handler();
		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
	});

	it('should show error when no template configured', async () => {
		(vscode.window as any).activeTextEditor = {
			document: {
				uri: vscode.Uri.parse('file:///test.ttl'),
				languageId: 'turtle',
			},
		};
		await createSparqlQueryFromDocument.handler();
		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
	});

	it('should open SPARQL document when template and workspace URI are available', async () => {
		mockGetConfig.mockImplementation(() => ({
			get: (k: string, d?: any) => k === 'language.sparql.documentQueryTemplate'
				? 'SELECT * WHERE { <{{documentUri}}> ?p ?o }'
				: d,
		}));
		(vscode.window as any).activeTextEditor = {
			document: {
				uri: vscode.Uri.parse('file:///w/test.ttl'),
				languageId: 'turtle',
			},
		};
		await createSparqlQueryFromDocument.handler();
		expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
		expect(vscode.window.showTextDocument).toHaveBeenCalled();
	});
});

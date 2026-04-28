import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({
		get: (_key: string, defaultValue?: any) => defaultValue ?? '',
	}),
}));

import * as vscode from 'vscode';
import { openDocument } from './open-document';

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.workspace as any).textDocuments = [];
	(vscode.window as any).activeTextEditor = undefined;
});

afterEach(() => {
	(vscode.workspace as any).textDocuments = [];
});

describe('openDocument', () => {
	it('should have the correct command id', () => {
		expect(openDocument.id).toBe('mentor.command.openDocument');
	});

	it('should show error when documentIri is empty', async () => {
		const showError = vi.spyOn(vscode.window, 'showErrorMessage');
		await openDocument.handler('');
		expect(showError).toHaveBeenCalledWith(expect.stringContaining('No document IRI'));
	});

	it('should create an untitled SPARQL document when documentIri is empty but query is provided', async () => {
		const fakeDoc = { uri: { toString: () => 'untitled:query.sparql' } };
		vi.spyOn(vscode.workspace as any, 'openTextDocument').mockResolvedValue(fakeDoc);
		const showDoc = vi.spyOn(vscode.window as any, 'showTextDocument');

		await openDocument.handler('', 'SELECT * WHERE { ?s ?p ?o }');

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
			expect.objectContaining({
				content: 'SELECT * WHERE { ?s ?p ?o }',
				language: 'sparql'
			})
		);
		expect(showDoc).toHaveBeenCalledWith(fakeDoc);
	});

	it('should open a text document for file scheme URIs', async () => {
		const fakeDoc = { uri: { toString: () => 'file:///test.ttl' } };
		vi.spyOn(vscode.workspace as any, 'openTextDocument').mockResolvedValue(fakeDoc);
		const showDoc = vi.spyOn(vscode.window as any, 'showTextDocument');

		await openDocument.handler('file:///test.ttl');

		expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
		expect(showDoc).toHaveBeenCalledWith(fakeDoc);
	});

	it('should open a notebook for vscode-notebook-cell URIs', async () => {
		const fakeNotebook = {
			getCells: vi.fn(() => []),
		};
		vi.spyOn(vscode.workspace as any, 'openNotebookDocument').mockResolvedValue(fakeNotebook);
		const fakeEditor = {
			notebook: fakeNotebook,
			revealRange: vi.fn(),
		};
		vi.spyOn(vscode.window as any, 'showNotebookDocument').mockResolvedValue(fakeEditor);

		await openDocument.handler('vscode-notebook-cell:///test.ipynb#W0sZmlsZQ%3D%3D');

		expect(vscode.workspace.openNotebookDocument).toHaveBeenCalled();
	});

	it('should show error when opening fails', async () => {
		vi.spyOn(vscode.workspace as any, 'openTextDocument').mockRejectedValue(new Error('not found'));
		const showError = vi.spyOn(vscode.window, 'showErrorMessage');

		await openDocument.handler('file:///nonexistent.ttl');

		expect(showError).toHaveBeenCalledWith(expect.stringContaining('Failed to open document'));
	});
});

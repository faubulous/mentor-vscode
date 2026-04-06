import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn(() => ({})),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { createNotebookFromEditor } from './create-notebook-from-editor';

beforeEach(() => {
	(vscode.window as any).activeTextEditor = undefined;
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.window as any).showNotebookDocument = vi.fn(async () => ({ selection: undefined }));
	(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
		uri: vscode.Uri.parse('untitled:notebook.mentor-notebook'),
		cellCount: 0,
		getCells: vi.fn(() => []),
		cellAt: vi.fn(() => null),
	}));
	(vscode.workspace as any).applyEdit = vi.fn(async () => true);
});

describe('createNotebookFromEditor command', () => {
	it('should have correct id', () => {
		expect(createNotebookFromEditor.id).toBe('mentor.command.createNotebookFromEditor');
	});

	it('should show error when no active editor', async () => {
		(vscode.window as any).activeTextEditor = undefined;
		await createNotebookFromEditor.handler();
		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
	});

	it('should open notebook from active editor content', async () => {
		(vscode.window as any).activeTextEditor = {
			document: {
				getText: vi.fn(() => 'SELECT * WHERE { ?s ?p ?o }'),
				languageId: 'sparql',
			},
		};
		await createNotebookFromEditor.handler();
		expect(vscode.workspace.openNotebookDocument).toHaveBeenCalledWith('mentor-notebook', expect.anything());
		expect(vscode.window.showNotebookDocument).toHaveBeenCalled();
	});
});

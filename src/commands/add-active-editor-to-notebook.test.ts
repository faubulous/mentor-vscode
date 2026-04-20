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
import { addActiveEditorToNotebook } from './add-active-editor-to-notebook';

beforeEach(() => {
	(vscode.window as any).activeTextEditor = undefined;
	(vscode.window as any).activeNotebookEditor = undefined;
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
	(vscode.window as any).showNotebookDocument = vi.fn(async () => ({
		selection: undefined,
		selections: [],
		revealRange: vi.fn(),
	}));
	(vscode.workspace as any).notebookDocuments = [];
	(vscode.workspace as any).findFiles = vi.fn(async () => []);
	(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
		uri: vscode.Uri.parse('untitled:notebook.mentor-notebook'),
		notebookType: 'mentor-notebook',
		cellCount: 0,
		getCells: vi.fn(() => []),
		cellAt: vi.fn(() => null),
	}));
	(vscode.workspace as any).applyEdit = vi.fn(async () => true);
});

describe('addActiveEditorToNotebook command', () => {
	it('should have correct id', () => {
		expect(addActiveEditorToNotebook.id).toBe('mentor.command.addActiveEditorToNotebook');
	});

	it('should show error when no active editor', async () => {
		(vscode.window as any).activeTextEditor = undefined;

		await addActiveEditorToNotebook.handler();

		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No active editor found.');
	});

	it('should create a new notebook when create-new is selected', async () => {
		(vscode.window as any).activeTextEditor = {
			document: {
				getText: vi.fn(() => 'SELECT * WHERE { ?s ?p ?o }'),
				languageId: 'sparql',
			},
		};
		(vscode.workspace as any).findFiles = vi.fn(async () => [
			vscode.Uri.parse('file:///workspace/b.mnb'),
			vscode.Uri.parse('file:///workspace/a.mnb'),
		]);
		(vscode.window as any).showQuickPick = vi.fn(async () => ({
			label: 'Create New Notebook',
			action: 'create-new',
		}));

		await addActiveEditorToNotebook.handler();

		const quickPickItems = ((vscode.window.showQuickPick as any).mock.calls[0] ?? [])[0] ?? [];
		expect(quickPickItems[0].action).toBe('create-new');
		expect(quickPickItems[0].label).toContain('Create New Notebook');
		expect(quickPickItems[1].label).toContain('a.mnb');
		expect(quickPickItems[2].label).toContain('b.mnb');

		expect(vscode.workspace.openNotebookDocument).toHaveBeenCalledWith('mentor-notebook', expect.anything());
		expect(vscode.window.showNotebookDocument).toHaveBeenCalled();
	});

	it('should add a new cell to selected workspace Mentor notebook', async () => {
		(vscode.window as any).activeTextEditor = {
			document: {
				getText: vi.fn(() => 'SELECT * WHERE { ?s ?p ?o }'),
				languageId: 'sparql',
			},
		};

		const notebookUri = vscode.Uri.parse('file:///workspace/example.mnb');
		(vscode.workspace as any).findFiles = vi.fn(async () => [notebookUri]);

		const notebook = {
			uri: notebookUri,
			notebookType: 'mentor-notebook',
			cellCount: 2,
		};

		(vscode.workspace as any).openNotebookDocument = vi.fn(async (arg: any) => {
			if (arg?.toString?.() === notebookUri.toString()) {
				return notebook;
			}

			return {
				uri: vscode.Uri.parse('untitled:notebook.mentor-notebook'),
				notebookType: 'mentor-notebook',
				cellCount: 0,
				getCells: vi.fn(() => []),
				cellAt: vi.fn(() => null),
			};
		});

		(vscode.window as any).showQuickPick = vi.fn(async (items: any[]) => items[1]);
		const mockNotebookEditor = {
			selection: undefined,
			selections: [],
			revealRange: vi.fn(),
		};
		(vscode.window as any).showNotebookDocument = vi.fn(async () => mockNotebookEditor);

		await addActiveEditorToNotebook.handler();

		expect(vscode.workspace.openNotebookDocument).toHaveBeenCalledWith(notebookUri);
		expect(vscode.workspace.applyEdit).toHaveBeenCalled();
		expect(vscode.window.showNotebookDocument).toHaveBeenCalledWith(notebook);
		expect(mockNotebookEditor.selections).toHaveLength(1);
		expect(mockNotebookEditor.selections[0].start).toBe(2);
		expect(mockNotebookEditor.selections[0].end).toBe(3);
		expect(mockNotebookEditor.revealRange).toHaveBeenCalledWith(
			expect.objectContaining({ start: 2, end: 3 }),
			vscode.NotebookEditorRevealType.InCenter
		);
	});

	it('should not change notebooks when quick pick is canceled', async () => {
		(vscode.window as any).activeTextEditor = {
			document: {
				getText: vi.fn(() => 'SELECT * WHERE { ?s ?p ?o }'),
				languageId: 'sparql',
			},
		};
		(vscode.workspace as any).findFiles = vi.fn(async () => [
			vscode.Uri.parse('file:///workspace/example.mnb'),
		]);
		(vscode.window as any).showQuickPick = vi.fn(async () => undefined);

		await addActiveEditorToNotebook.handler();

		expect(vscode.workspace.openNotebookDocument).not.toHaveBeenCalledWith(vscode.Uri.parse('file:///workspace/example.mnb'));
		expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
	});

	it('should not list untitled notebooks that are not in workspace', async () => {
		(vscode.window as any).activeTextEditor = {
			document: {
				getText: vi.fn(() => 'SELECT * WHERE { ?s ?p ?o }'),
				languageId: 'sparql',
			},
		};

		(vscode.workspace as any).findFiles = vi.fn(async () => [
			vscode.Uri.parse('file:///workspace/a.mnb'),
		]);
		(vscode.window as any).showQuickPick = vi.fn(async () => ({
			label: 'Create New Notebook',
			action: 'create-new',
		}));

		await addActiveEditorToNotebook.handler();

		const quickPickItems = ((vscode.window.showQuickPick as any).mock.calls[0] ?? [])[0] ?? [];
		expect(quickPickItems).toHaveLength(2);
		expect(quickPickItems[1].label).toContain('a.mnb');
	});
});
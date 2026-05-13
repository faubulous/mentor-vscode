import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('../mocks/vscode'));

import * as vscode from 'vscode';
import {
	findNotebookContainingCell,
	findOpenNotebookByUri,
	resolveNotebookFromContext,
} from './notebook';

beforeEach(() => {
	(vscode.workspace as any).notebookDocuments = [];
	(vscode.window as any).activeNotebookEditor = undefined;
});

describe('resolveNotebookFromContext', () => {
	it('returns notebook from context.notebook', () => {
		const notebook = { uri: vscode.Uri.parse('file:///from-context.mnb') } as vscode.NotebookDocument;

		expect(resolveNotebookFromContext({ notebook })).toBe(notebook);
	});

	it('returns notebook from context.notebookEditor.notebook', () => {
		const notebook = { uri: vscode.Uri.parse('file:///from-editor.mnb') } as vscode.NotebookDocument;
		const notebookEditor = { notebook } as vscode.NotebookEditor;

		expect(resolveNotebookFromContext({ notebookEditor })).toBe(notebook);
	});

	it('returns notebook by matching uri argument against open notebook documents', () => {
		const notebook = { uri: vscode.Uri.parse('file:///from-uri.mnb') } as vscode.NotebookDocument;
		(vscode.workspace as any).notebookDocuments = [notebook];

		expect(resolveNotebookFromContext(vscode.Uri.parse('file:///from-uri.mnb'))).toBe(notebook);
	});

	it('falls back to the active notebook editor when context does not resolve', () => {
		const activeNotebook = { uri: vscode.Uri.parse('file:///active.mnb') } as vscode.NotebookDocument;
		(vscode.window as any).activeNotebookEditor = { notebook: activeNotebook };

		expect(resolveNotebookFromContext({})).toBe(activeNotebook);
	});
});

describe('findOpenNotebookByUri', () => {
	it('returns open notebook matching uri', () => {
		const openNotebook = { uri: vscode.Uri.parse('file:///open.mnb') } as vscode.NotebookDocument;
		(vscode.workspace as any).notebookDocuments = [openNotebook];

		expect(findOpenNotebookByUri(vscode.Uri.parse('file:///open.mnb'))).toBe(openNotebook);
	});

	it('returns undefined when no open notebook matches', () => {
		(vscode.workspace as any).notebookDocuments = [];

		expect(findOpenNotebookByUri(vscode.Uri.parse('file:///missing.mnb'))).toBeUndefined();
	});
});

describe('findNotebookContainingCell', () => {
	it('returns notebook containing target cell uri', () => {
		const cellUri = vscode.Uri.parse('vscode-notebook-cell:/nb.mnb#cell-1');
		const notebook = {
			uri: vscode.Uri.parse('file:///nb.mnb'),
			getCells: vi.fn(() => [{ document: { uri: cellUri } }]),
		} as unknown as vscode.NotebookDocument;
		(vscode.workspace as any).notebookDocuments = [notebook];

		expect(findNotebookContainingCell(cellUri)).toBe(notebook);
	});

	it('returns undefined when no notebook contains target cell uri', () => {
		const cellUri = vscode.Uri.parse('vscode-notebook-cell:/missing.mnb#cell-2');
		(vscode.workspace as any).notebookDocuments = [];

		expect(findNotebookContainingCell(cellUri)).toBeUndefined();
	});
});

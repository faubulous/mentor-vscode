import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { resolveQueryContext, isNotebookCell } from '@src/utilities/query-context';

beforeEach(() => {
	(vscode.workspace as any).textDocuments = [];
	(vscode.workspace as any).notebookDocuments = [];
	(vscode.window as any).activeTextEditor = undefined;
});

describe('resolveQueryContext', () => {
	it('resolves a plain text document by URI', () => {
		const uri = vscode.Uri.parse('file:///q.sparql');
		const document = { uri, languageId: 'sparql' };
		(vscode.workspace as any).textDocuments = [document];

		const result = resolveQueryContext(uri.toString());

		expect(result).toBe(document);
		expect(isNotebookCell(result!)).toBe(false);
	});

	it('resolves the owning notebook cell even though its document is also a text document', () => {
		// A notebook cell's document appears in both workspace.textDocuments and the
		// notebook's cells; the cell must win so output is routed to the cell.
		const uri = vscode.Uri.parse('vscode-notebook-cell:///nb#c1');
		const cell = { notebook: {}, document: { uri, languageId: 'sparql' } };
		(vscode.workspace as any).textDocuments = [cell.document];
		(vscode.workspace as any).notebookDocuments = [{ getCells: () => [cell] }];

		const result = resolveQueryContext(uri.toString());

		expect(result).toBe(cell);
		expect(isNotebookCell(result!)).toBe(true);
	});

	it('falls back to the active editor when no URI is given', () => {
		const document = { uri: vscode.Uri.parse('file:///active.sparql'), languageId: 'sparql' };
		(vscode.window as any).activeTextEditor = { document };

		expect(resolveQueryContext()).toBe(document);
	});

	it('returns undefined when the URI matches nothing', () => {
		expect(resolveQueryContext('file:///missing.sparql')).toBeUndefined();
	});
});

import * as vscode from 'vscode';
import { findOpenNotebookByUri } from './notebook';

/**
 * Whether a text or notebook document is currently open, i.e. VS Code holds its
 * content in memory and keeps it in sync with the file on disk.
 * @param uri The document URI.
 */
export function isDocumentOpen(uri: vscode.Uri): boolean {
	const key = uri.toString();

	if (vscode.workspace.textDocuments.some(document => document.uri.toString() === key)) {
		return true;
	}

	return findOpenNotebookByUri(uri) !== undefined;
}

/**
 * Whether a document is currently visible in an editor. Includes notebook cell
 * editors, which `vscode.window.visibleTextEditors` does not contain. The
 * fallback to an empty list keeps this callable in test environments whose
 * mocks predate `visibleNotebookEditors`.
 * @param uri The document URI.
 */
export function isDocumentVisible(uri: vscode.Uri): boolean {
	const key = uri.toString();

	if (vscode.window.visibleTextEditors.some(editor => editor.document.uri.toString() === key)) {
		return true;
	}

	return (vscode.window.visibleNotebookEditors ?? []).some(editor =>
		editor.notebook.getCells().some(cell => cell.document.uri.toString() === key));
}

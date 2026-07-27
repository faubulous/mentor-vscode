import * as vscode from 'vscode';

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

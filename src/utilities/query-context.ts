// Note: this module imports 'vscode' and must NOT be re-exported from the
// utilities barrel (./index.ts), which is consumed by the language servers where
// 'vscode' is unavailable. Import it directly via '@src/utilities/query-context'.
import * as vscode from 'vscode';

/**
 * Resolves a document URI to the text document or notebook cell it identifies.
 *
 * Searches the open text documents first, then the cells of all open notebooks
 * (a notebook cell document has the `vscode-notebook-cell` scheme). When no URI
 * is given, falls back to the active text editor's document.
 *
 * @param uri A document or notebook-cell URI, or `undefined` to use the active editor.
 * @returns The matching text document or notebook cell, or `undefined` if none was found.
 */
export function resolveQueryContext(uri?: vscode.Uri | string): vscode.TextDocument | vscode.NotebookCell | undefined {
	if (!uri) {
		return vscode.window.activeTextEditor?.document;
	}

	const parsed = typeof uri === 'string' ? vscode.Uri.parse(uri) : uri;
	const target = parsed.toString();

	// Notebook cell documents also appear in `workspace.textDocuments`, so for a
	// cell URI we must resolve the owning NotebookCell first — otherwise the plain
	// text document is returned and the result is routed to the panel rather than
	// the cell output.
	if (parsed.scheme === 'vscode-notebook-cell') {
		for (const notebook of vscode.workspace.notebookDocuments) {
			const cell = notebook.getCells().find(c => c.document.uri.toString() === target);

			if (cell) {
				return cell;
			}
		}
	}

	return vscode.workspace.textDocuments.find(doc => doc.uri.toString() === target);
}

/**
 * Type guard that narrows a query context to a notebook cell.
 * @param context A text document or notebook cell.
 */
export function isNotebookCell(context: vscode.TextDocument | vscode.NotebookCell): context is vscode.NotebookCell {
	return 'notebook' in context && !!(context as vscode.NotebookCell).notebook;
}

/**
 * Returns the underlying text document for a query context, whether it is a plain
 * text document or a notebook cell.
 * @param context A text document or notebook cell.
 */
export function getContextDocument(context: vscode.TextDocument | vscode.NotebookCell): vscode.TextDocument {
	return isNotebookCell(context) ? context.document : context;
}

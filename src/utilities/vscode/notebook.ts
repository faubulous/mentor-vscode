import * as vscode from 'vscode';

/**
 * A utility type that represents the possible forms of command arguments 
 * that can be used to identify a target notebook.
 */
type NotebookContext = {
	notebook?: vscode.NotebookDocument;
	notebookEditor?: vscode.NotebookEditor;
};

/**
 * Indicates whether a value is an object with string keys and unknown values.
 * @param object The object to check.
 * @returns True if the value is an object with string keys and unknown values, false otherwise.
 */
function isObjectLike(object: unknown): object is Record<string, unknown> {
	return typeof object === 'object' && object !== null;
}

/**
 * Indicates whether a value is a NotebookContext, which may be passed as a command argument in various forms.
 * @param object The object to check.
 * @returns True if the value is a NotebookContext, false otherwise.
 */
function isNotebookContext(object: unknown): object is NotebookContext {
	return isObjectLike(object) && ('notebook' in object || 'notebookEditor' in object);
}

/**
 * Indicates whether a value is a vscode.Uri or behaves like one (has scheme, path, and toString()).
 * @param value The value to check.
 * @returns True if the value is a vscode.Uri or behaves like one, false otherwise.
 */
function isUriLike(value: unknown): value is vscode.Uri {
	return isObjectLike(value)
		&& 'scheme' in value
		&& 'path' in value
		&& 'toString' in value
		&& typeof value.toString === 'function';
}

/**
 * Finds an open notebook by its URI.
 * @param uri The URI of the notebook to find.
 * @returns The open notebook document if found, undefined otherwise.
 */
export function findOpenNotebookByUri(uri: vscode.Uri): vscode.NotebookDocument | undefined {
	const targetUri = uri.toString();

	return vscode.workspace.notebookDocuments.find(n => n.uri.toString() === targetUri);
}

/**
 * Finds the notebook document that contains a cell with the given document URI.
 * @param cellDocumentUri The URI of the cell document to find.
 * @returns The notebook document containing the cell if found, undefined otherwise.
 */
export function findNotebookContainingCell(cellDocumentUri: vscode.Uri): vscode.NotebookDocument | undefined {
	const targetCellUri = cellDocumentUri.toString();

	return vscode.workspace.notebookDocuments.find(
		nb => nb.getCells().some(c => c.document.uri.toString() === targetCellUri)
	);
}

/**
 * Resolves a target notebook from command arguments, with a fallback to the active notebook editor.
 * @param context The command argument that may contain notebook information or a URI.
 * @returns The resolved notebook document if found, undefined otherwise.
 */
export function resolveNotebookFromContext(context?: unknown): vscode.NotebookDocument | undefined {
	if (isNotebookContext(context)) {
		if (context.notebook) {
			return context.notebook;
		}

		if (context.notebookEditor?.notebook) {
			return context.notebookEditor.notebook;
		}
	}

	if (isUriLike(context)) {
		const notebook = findOpenNotebookByUri(context);

		if (notebook) {
			return notebook;
		}
	}

	return vscode.window.activeNotebookEditor?.notebook;
}

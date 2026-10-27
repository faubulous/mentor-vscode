import * as vscode from 'vscode';

/**
 * Resolve the document that an editor action should operate on. Editor title actions receive
 * the resource of the editor they were invoked from, but commands invoked from the command
 * palette do not, and a focused webview-based editor such as the form editor leaves
 * `window.activeTextEditor` undefined. The active tab is consulted last so that actions
 * contributed for custom editors keep working.
 * @param uri The resource passed by VS Code to an editor action, if any.
 * @returns A promise that resolves to the document, or `undefined` if none could be resolved.
 */
export async function resolveActiveRdfDocument(uri?: vscode.Uri): Promise<vscode.TextDocument | undefined> {
	if (uri) {
		return await _openTextDocument(uri);
	}

	const activeEditorDocument = vscode.window.activeTextEditor?.document;

	if (activeEditorDocument) {
		return activeEditorDocument;
	}

	const activeTabUri = getActiveTabResource();

	return activeTabUri ? await _openTextDocument(activeTabUri) : undefined;
}

/**
 * Get the resource of the active editor tab, regardless of the kind of editor showing it.
 * @returns The resource of the active tab, or `undefined` if it has none.
 */
export function getActiveTabResource(): vscode.Uri | undefined {
	const input = vscode.window.tabGroups?.activeTabGroup?.activeTab?.input as { uri?: vscode.Uri } | undefined;

	return input?.uri;
}

/**
 * Open a text document without surfacing an error when the resource cannot be opened.
 * @param uri The resource to open.
 * @returns A promise that resolves to the document, or `undefined` if it could not be opened.
 */
async function _openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument | undefined> {
	const openDocument = vscode.workspace.textDocuments.find(document => document.uri.toString() === uri.toString());

	if (openDocument) {
		return openDocument;
	}

	try {
		return await vscode.workspace.openTextDocument(uri);
	} catch {
		return undefined;
	}
}

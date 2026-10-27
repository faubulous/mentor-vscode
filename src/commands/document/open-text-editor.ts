import * as vscode from 'vscode';
import { getActiveTabResource } from '@src/utilities/vscode/active-rdf-document';
import { switchEditorView } from '@src/utilities/vscode/editors';

/**
 * Show the document of the active editor as text, replacing the form editor in its tab.
 */
export const openTextEditor = {
	id: 'mentor.command.openTextEditor',
	handler: async (documentUri?: vscode.Uri) => {
		const uri = documentUri ?? getActiveTabResource() ?? vscode.window.activeTextEditor?.document.uri;

		if (!uri) {
			vscode.window.showErrorMessage('No document selected.');
			return;
		}

		await switchEditorView(uri, 'default');
	}
};

import * as vscode from 'vscode';
import { FormEditorProvider } from '@src/views/webviews/views/form-editor';
import { getActiveTabResource } from '@src/utilities/vscode/active-rdf-document';
import { switchEditorView } from '@src/utilities/vscode/editors';

/**
 * Show the active RDF document in the form based editor, replacing the text editor in its tab.
 */
export const openFormEditor = {
	id: 'mentor.command.openFormEditor',
	handler: async (documentUri?: vscode.Uri) => {
		const uri = documentUri ?? vscode.window.activeTextEditor?.document.uri ?? getActiveTabResource();

		if (!uri) {
			vscode.window.showErrorMessage('No document selected.');
			return;
		}

		await switchEditorView(uri, FormEditorProvider.viewType);
	}
};

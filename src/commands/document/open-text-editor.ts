import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { FormEditorDefaultView } from '@src/views/webviews/views/form-editor';
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

		// Remember the choice so that a configured default of the form editor does not
		// immediately reopen the form the user just left.
		if (container.isRegistered(ServiceToken.FormEditorDefaultView)) {
			container.resolve<FormEditorDefaultView>(ServiceToken.FormEditorDefaultView).dismiss(uri);
		}

		await switchEditorView(uri, 'default');
	}
};

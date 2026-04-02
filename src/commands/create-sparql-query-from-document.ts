import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { WorkspaceUri } from '@src/providers';

export const createSparqlQueryFromDocument = {
	id: 'mentor.command.createSparqlQueryFromDocument',
	handler: async (): Promise<void> => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage('No active editor found.');
			return;
		}

		const documentUri = WorkspaceUri.toWorkspaceUri(editor.document.uri);
		const template = getConfig().get<string>('language.sparql.documentQueryTemplate');

		if (template && documentUri) {
			const content = template.replace(/\{\{documentUri\}\}/g, documentUri.toString());
			const document = await vscode.workspace.openTextDocument({ content, language: 'sparql' });

			await vscode.window.showTextDocument(document);
		} else {
			vscode.window.showErrorMessage('SPARQL query template is not defined in settings.');
		}
	}
};

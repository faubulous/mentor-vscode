import * as vscode from 'vscode';
import { mentor } from '../mentor';

export const sortPrefixes = {
	id: 'mentor.command.sortPrefixes',
	handler: async (documentUri: vscode.Uri) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const edit = await mentor.prefixDeclarationService.sortPrefixes(document);

			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	}
};
import * as vscode from 'vscode';
import { mentor } from '../mentor';

export const implementPrefixes = {
	commandId: 'mentor.command.implementPrefixes',
	handler: async (documentUri: vscode.Uri, prefixes: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const edit = await mentor.prefixDeclarationService.implementPrefixes(document, prefixes.map(p => ({ prefix: p, namespaceIri: undefined })));

			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	}
};
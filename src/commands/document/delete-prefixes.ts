import * as vscode from 'vscode';
import { resolvePrefixDefinitionService } from '@src/languages/resolve-prefix-definition-service';

export const deletePrefixes = {
	id: 'mentor.command.deletePrefixes',
	handler: async (documentUri: vscode.Uri, prefixes: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const service = resolvePrefixDefinitionService(document);
			const edit = await service.deletePrefixes(document, prefixes);
			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	}
};
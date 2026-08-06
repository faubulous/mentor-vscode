import * as vscode from 'vscode';
import { resolvePrefixDefinitionService } from '@src/languages/resolve-prefix-definition-service';

export const sortPrefixes = {
	id: 'mentor.command.sortPrefixes',
	handler: async (documentUri: vscode.Uri) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const service = resolvePrefixDefinitionService(document);
			const edit = await service.sortPrefixes(document);

			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	}
};
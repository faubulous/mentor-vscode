import * as vscode from 'vscode';
import { resolvePrefixDefinitionService } from '@src/languages/resolve-prefix-definition-service';

export const implementPrefixes = {
	id: 'mentor.command.implementPrefixes',
	handler: async (documentUri: vscode.Uri, prefixes: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const service = resolvePrefixDefinitionService(document);
			const edit = await service.implementPrefixes(document, prefixes.map(p => ({ prefix: p, namespaceIri: undefined })));

			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	}
};
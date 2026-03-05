import * as vscode from 'vscode';
import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { TurtlePrefixDefinitionService } from '@src/languages/turtle/services/turtle-prefix-definition-service';

export const implementPrefixes = {
	id: 'mentor.command.implementPrefixes',
	handler: async (documentUri: vscode.Uri, prefixes: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const service = container.resolve<TurtlePrefixDefinitionService>(ServiceToken.TurtlePrefixDefinitionService);
			const edit = await service.implementPrefixes(document, prefixes.map(p => ({ prefix: p, namespaceIri: undefined })));

			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	}
};
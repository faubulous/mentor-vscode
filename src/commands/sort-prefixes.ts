import * as vscode from 'vscode';
import { container } from '@src/container';
import { TurtlePrefixDefinitionService } from '@src/languages/turtle/services/turtle-prefix-definition-service';

export const sortPrefixes = {
	id: 'mentor.command.sortPrefixes',
	handler: async (documentUri: vscode.Uri) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());

		if (document) {
			const service = container.resolve(TurtlePrefixDefinitionService);
			const edit = await service.sortPrefixes(document);

			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	}
};
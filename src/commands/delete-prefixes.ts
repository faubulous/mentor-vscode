import * as vscode from 'vscode';
import { container } from '../container';
import { InjectionToken } from '@src/injection-token';
import { TurtlePrefixDefinitionService } from '../languages/turtle/services/turtle-prefix-definition-service';

export const deletePrefixes = {
	id: 'mentor.command.deletePrefixes',
	handler: async (documentUri: vscode.Uri, prefixes: string[]) => {
		const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri.toString());
		
		if (document) {
			const service = container.resolve<TurtlePrefixDefinitionService>(InjectionToken.TurtlePrefixDefinitionService);
			const edit = await service.deletePrefixes(document, prefixes);
			if (edit.size > 0) {
				await vscode.workspace.applyEdit(edit);
			}
		}
	}
};
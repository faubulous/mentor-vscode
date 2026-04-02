import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { ResourceDefinitionProvider } from '@src/providers';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';

export const findReferences = {
	id: 'mentor.command.findReferences',
	handler: async (arg: DefinitionTreeNode | string) => {
		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);

		contextService.activateDocument().then((editor) => {
			if (contextService.activeContext && editor) {
				const iri = getIriFromArgument(arg);
				const location = new ResourceDefinitionProvider().provideDefinitionForResource(contextService.activeContext, iri);

				if (location instanceof vscode.Location) {
					// We need to set the selection before executing the findReferences command.
					const start = location.range.start;
					const end = location.range.end;

					editor.selection = new vscode.Selection(start, end);

					// Note: The findReferences command operates on the active editor selection.
					vscode.commands.executeCommand('references-view.findReferences', editor.document.uri);
				}
			}
		});
	}
};
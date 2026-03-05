import * as vscode from 'vscode';
import { container, DocumentContextService } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { DefinitionProvider } from '@src/providers';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';

const contextService = () => container.resolve<DocumentContextService>(InjectionToken.DocumentContextService);

export const revealDefinition = {
	id: 'mentor.command.revealDefinition',
	handler: async (arg: DefinitionTreeNode | string, restoreFocus: boolean = false) => {
		const ctx = contextService();
		ctx.activateDocument().then((editor) => {
			const uri = getIriFromArgument(arg);

			if (!uri) {
				// If no id is provided, we fail gracefully.
				return;
			}

			if (ctx.activeContext && editor && uri) {
				const location = new DefinitionProvider().provideDefinitionForIri(ctx.activeContext, uri, true);

				if (location instanceof vscode.Location) {
					editor.selection = new vscode.Selection(location.range.start, location.range.end);
					editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);

					if (restoreFocus) {
						// Reset the focus to the definition tree.
						vscode.commands.executeCommand('mentor.view.definitionTree.focus');
					}
				}
			}
		});
	}
};
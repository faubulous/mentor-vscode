import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { DefinitionProvider } from '@src/providers';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';

export const revealDefinition = {
	commandId: 'mentor.command.revealDefinition',
	handler: async (arg: DefinitionTreeNode | string, restoreFocus: boolean = false) => {
		mentor.activateDocument().then((editor) => {
			const uri = getIriFromArgument(arg);

			if (!uri) {
				// If no id is provided, we fail gracefully.
				return;
			}

			if (mentor.activeContext && editor && uri) {
				const location = new DefinitionProvider().provideDefinitionForIri(mentor.activeContext, uri, true);

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
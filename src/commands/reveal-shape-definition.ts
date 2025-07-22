import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { DefinitionProvider } from '@/providers';
import { DefinitionTreeNode, getIriFromArgument } from '@/views/definition-tree/definition-tree-node';

export async function revealShapeDefinition(arg: DefinitionTreeNode | string, restoreFocus: boolean = false) {
	mentor.activateDocument().then((editor) => {
		const uri = getIriFromArgument(arg);

		if (!uri || !editor || !mentor.activeContext) {
			// If no id is provided, we fail gracefully.
			return;
		}

		const shapeUri = mentor.vocabulary.getShapes(mentor.activeContext.graphs, uri, { includeBlankNodes: true })[0];

		if (!shapeUri) {
			return;
		}

		const location = new DefinitionProvider().provideDefinitionForIri(mentor.activeContext, shapeUri, true);

		if (location instanceof vscode.Location) {
			editor.selection = new vscode.Selection(location.range.start, location.range.end);
			editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);

			if (restoreFocus) {
				// Reset the focus to the definition tree.
				vscode.commands.executeCommand('mentor.view.definitionTree.focus');
			}
		}
	});
}
import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { DefinitionProvider } from '@/providers';
import { DefinitionTreeNode, getIriFromArgument } from '@/views/definition-tree-node';

export async function findReferences(arg: DefinitionTreeNode | string) {
	mentor.activateDocument().then((editor) => {
		if (mentor.activeContext && editor) {
			const iri = getIriFromArgument(arg);
			const location = new DefinitionProvider().provideDefinitionForIri(mentor.activeContext, iri);

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
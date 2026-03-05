import * as vscode from 'vscode';
import { container, VocabularyRepository, DocumentContextService } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { DefinitionProvider } from '@src/providers';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';

export const revealShapeDefinition = {
	id: 'mentor.command.revealShapeDefinition',
	handler: async (arg: DefinitionTreeNode | string, restoreFocus: boolean = false) => {
		const uri = getIriFromArgument(arg);
		const contextService = container.resolve<DocumentContextService>(ServiceToken.DocumentContextService);
		contextService.activateDocument().then((editor) => {

			if (!uri || !editor || !contextService.activeContext) {
				// If no id is provided, we fail gracefully.
				return;
			}

			const vocabulary = container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
			const shapeUri = vocabulary.getShapes(contextService.activeContext.graphs, uri, { includeBlankNodes: true }).next().value;

			if (!shapeUri) {
				return;
			}

			const location = new DefinitionProvider().provideDefinitionForIri(contextService.activeContext, shapeUri, true);

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
};
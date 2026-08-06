import * as vscode from 'vscode';
import { DefinitionTreeNode } from '@src/views/trees/definition-tree/definition-tree-node';
import { resolveShapeDefinitionLocations } from './shape-definition-locations';

export const showShapeReferences = {
	id: 'mentor.command.showShapeReferences',
	handler: async (arg: DefinitionTreeNode | string) => {
		const shapeDefinitions = await resolveShapeDefinitionLocations(arg);

		if (!shapeDefinitions) {
			return;
		}

		await vscode.commands.executeCommand(
			'editor.action.peekLocations',
			shapeDefinitions.editor.document.uri,
			shapeDefinitions.editor.selection.active,
			shapeDefinitions.locations,
			'peek'
		);
	}
};
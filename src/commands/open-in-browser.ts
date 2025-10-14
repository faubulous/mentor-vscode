import * as vscode from 'vscode';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';
import { InferenceUri } from '@src/workspace/inference-uri';

export const openInBrowser = {
	id: 'mentor.command.openInBrowser',
	handler: async (arg: DefinitionTreeNode | string) => {
		let uri = vscode.Uri.parse(getIriFromArgument(arg), true);

		if (InferenceUri.isInferenceUri(uri)) {
			await vscode.commands.executeCommand('mentor.command.openGraph', uri);
		} else {
			await vscode.commands.executeCommand('vscode.open', uri);
		}
	}
};
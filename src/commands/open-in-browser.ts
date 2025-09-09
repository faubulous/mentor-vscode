import * as vscode from 'vscode';
import { DefinitionTreeNode, getIriFromArgument } from '@/views/definition-tree/definition-tree-node';
import { InferenceUri } from '@/workspace/inference-uri';

export async function openInBrowser(arg: DefinitionTreeNode | string) {
	let uri = vscode.Uri.parse(getIriFromArgument(arg), true);

	if (InferenceUri.isInferenceUri(uri)) {
		await vscode.commands.executeCommand('mentor.command.openGraph', uri);
	} else {
		await vscode.commands.executeCommand('vscode.open', uri);
	}
}
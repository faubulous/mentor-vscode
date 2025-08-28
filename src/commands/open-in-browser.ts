import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { DefinitionTreeNode, getIriFromArgument } from '@/views/definition-tree/definition-tree-node';

export async function openInBrowser(arg: DefinitionTreeNode | string) {
	let uri = vscode.Uri.parse(getIriFromArgument(arg), true);
	const simpleBrowser = mentor.configuration.get('internalBrowserEnabled');

	if (simpleBrowser === true && (uri.scheme === 'http' || uri.scheme === 'https')) {
		await vscode.commands.executeCommand('simpleBrowser.show', uri);
	} else {
		await vscode.commands.executeCommand('vscode.open', uri);
	}
}
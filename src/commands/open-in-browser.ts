import * as vscode from 'vscode';
import { mentor } from '../mentor';
import { DefinitionTreeNode, getIriFromArgument } from '@/views/definition-tree-node';

export async function openInBrowser(arg: DefinitionTreeNode | string) {
	const internalBrowser = mentor.configuration.get('internalBrowserEnabled');
	const uri = getIriFromArgument(arg);

	if (internalBrowser === true) {
		vscode.commands.executeCommand('simpleBrowser.show', uri);
	} else {
		vscode.env.openExternal(vscode.Uri.parse(uri, true));
	}
}
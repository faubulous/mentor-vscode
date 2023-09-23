'use strict';
import * as vscode from 'vscode';
import { ClassNodeProvider } from './classes';
import { JsonOutlineProvider } from './jsonOutline';

export async function activate(context: vscode.ExtensionContext) {
	const classProvider = new ClassNodeProvider();
	vscode.window.registerTreeDataProvider('classExplorer', classProvider);
	vscode.commands.registerCommand('classExplorer.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('classExplorer.editEntry', (node: string) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node}.`));
	vscode.commands.registerCommand('classExplorer.deleteEntry', (node: string) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node}.`));
	// vscode.commands.registerCommand('classes.refreshEntry', () => classProvider.refresh());
	vscode.commands.registerCommand('extension.browseResource', (uri: string) => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(uri)));
	vscode.commands.registerCommand('extension.selectResource', (uri: string) => classProvider.select(uri));

	const jsonOutlineProvider = new JsonOutlineProvider(context);
	vscode.window.registerTreeDataProvider('jsonOutline', jsonOutlineProvider);
	vscode.commands.registerCommand('jsonOutline.refresh', () => jsonOutlineProvider.refresh());
	vscode.commands.registerCommand('jsonOutline.refreshNode', offset => jsonOutlineProvider.refresh(offset));
	vscode.commands.registerCommand('jsonOutline.renameNode', args => {
		let offset = undefined;
		if (args.selectedTreeItems && args.selectedTreeItems.length) {
			offset = args.selectedTreeItems[0];
		} else if (typeof args === 'number') {
			offset = args;
		}
		if (offset) {
			jsonOutlineProvider.rename(offset);
		}
	});
	vscode.commands.registerCommand('extension.openJsonSelection', range => jsonOutlineProvider.select(range));
}
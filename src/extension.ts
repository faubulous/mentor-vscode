'use strict';
import * as vscode from 'vscode';
import { ClassNodeProvider } from './class-node-provider';

export async function activate(context: vscode.ExtensionContext) {	
	const classProvider = new ClassNodeProvider();
	vscode.window.registerTreeDataProvider('classExplorer', classProvider);
	vscode.commands.registerCommand('classExplorer.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('classExplorer.editEntry', (node: string) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node}.`));
	vscode.commands.registerCommand('classExplorer.deleteEntry', (node: string) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node}.`));
	vscode.commands.registerCommand('classExplorer.toggleReferenced', () => {
		classProvider.toggleReferenced();
		classProvider.refresh();
	});
	// vscode.commands.registerCommand('classes.refreshEntry', () => classProvider.refresh());
	vscode.commands.registerCommand('extension.browseResource', (uri: string) => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(uri)));
	vscode.commands.registerCommand('extension.selectResource', (uri: string) => classProvider.select(uri));
	vscode.commands.registerCommand('extension.openExternal', (uri: string) => vscode.env.openExternal(vscode.Uri.parse(uri)));
	vscode.commands.registerCommand('extension.setNamespaceColor', (uri: string) => {
		vscode.commands.executeCommand('editor.action.showOrFocusStandaloneColorPicker').then((value) => {
			console.debug(value);
		});
	});
}
'use strict';
import { ExtensionContext, Uri, window, commands, env } from 'vscode';
import { ClassNodeProvider } from './class-node-provider';
import { ComponentGalleryPanel } from './panels/ComponentGalleryPanel';
import { ComponentGalleryViewProvider } from './panels/ComponentGalleryViewProvider';

export async function activate(context: ExtensionContext) {
	const classProvider = new ClassNodeProvider();
	window.registerTreeDataProvider('classExplorer', classProvider);
	commands.registerCommand('classExplorer.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
	commands.registerCommand('classExplorer.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
	commands.registerCommand('classExplorer.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
	commands.registerCommand('classExplorer.refreshEntry', () => classProvider.refresh());
	commands.registerCommand('classExplorer.toggleReferenced', () => {
		classProvider.toggleReferenced();
		classProvider.refresh();
	});
	commands.registerCommand('extension.browseResource', (uri: string) => commands.executeCommand('open', Uri.parse(uri)));
	commands.registerCommand('extension.selectResource', (uri: string) => classProvider.select(uri));
	commands.registerCommand('extension.openExternal', (uri: string) => env.openExternal(Uri.parse(uri)));
	commands.registerCommand('extension.setNamespaceColor', (uri: string) => {
		commands.executeCommand('editor.action.showOrFocusStandaloneColorPicker').then((value) => {
			console.debug(value);
		});
	});

	// // Create the show gallery command
	const command = () => { ComponentGalleryPanel.render(context.extensionUri);	}
	const showGalleryCommand = commands.registerCommand("mentor.testWebView", command);

	context.subscriptions.push(showGalleryCommand);

	const provider = new ComponentGalleryViewProvider(context.extensionUri);
	const showGalleryProvider = window.registerWebviewViewProvider(ComponentGalleryViewProvider.viewType, provider)

	context.subscriptions.push(showGalleryProvider);
}
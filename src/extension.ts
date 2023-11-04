'use strict';
import { ExtensionContext, Uri, window, commands, env } from 'vscode';
import { ComponentGalleryPanel } from './panels/ComponentGalleryPanel';
import { ComponentGalleryViewProvider } from './panels/ComponentGalleryViewProvider';
import { ClassNodeProvider } from './class-node-provider';
import { PropertyNodeProvider } from './property-node-provider';
import { IndividualNodeProvider } from './individual-node-provider';

export async function activate(context: ExtensionContext) {
	commands.registerCommand('mentor.command.browseResource', (uri: string) => commands.executeCommand('open', Uri.parse(uri)));
	commands.registerCommand('mentor.command.openExternal', (uri: string) => env.openExternal(Uri.parse(uri)));
	commands.registerCommand('mentor.command.setNamespaceColor', (uri: string) => {
		commands.executeCommand('editor.action.showOrFocusStandaloneColorPicker').then((value) => {
			console.debug(value);
		});
	});

	const classProvider = new ClassNodeProvider();
	window.registerTreeDataProvider('mentor.classExplorer', classProvider);

	commands.registerCommand('mentor.classExplorer.command.selectEntry', (uri: string) => classProvider.select(uri));
	commands.registerCommand('mentor.classExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
	commands.registerCommand('mentor.classExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
	commands.registerCommand('mentor.classExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
	commands.registerCommand('mentor.classExplorer.command.refreshEntry', () => classProvider.refresh());
	commands.registerCommand('mentor.classExplorer.command.toggleReferenced', () => {
		classProvider.toggleReferenced();
		classProvider.refresh();
	});

	const propertyProvider = new PropertyNodeProvider();
	window.registerTreeDataProvider('mentor.propertyExplorer', propertyProvider);

	commands.registerCommand('mentor.propertyExplorer.command.selectEntry', (uri: string) => propertyProvider.select(uri));
	commands.registerCommand('mentor.propertyExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
	commands.registerCommand('mentor.propertyExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
	commands.registerCommand('mentor.propertyExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
	commands.registerCommand('mentor.propertyExplorer.command.refreshEntry', () => classProvider.refresh());
	commands.registerCommand('mentor.propertyExplorer.command.toggleReferenced', () => {
		propertyProvider.toggleReferenced();
		propertyProvider.refresh();
	});

	const individualProvider = new IndividualNodeProvider();
	window.registerTreeDataProvider('mentor.individualExplorer', individualProvider);

	commands.registerCommand('mentor.individualExplorer.command.selectEntry', (uri: string) => individualProvider.select(uri));
	commands.registerCommand('mentor.individualExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
	commands.registerCommand('mentor.individualExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
	commands.registerCommand('mentor.individualExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
	commands.registerCommand('mentor.individualExplorer.command.refreshEntry', () => classProvider.refresh());
	commands.registerCommand('mentor.individualExplorer.command.toggleReferenced', () => {
		individualProvider.toggleReferenced();
		individualProvider.refresh();
	});

	// // Create the show gallery command
	const command = () => { ComponentGalleryPanel.render(context.extensionUri);	}
	const showGalleryCommand = commands.registerCommand("mentor.command.testWebView", command);

	context.subscriptions.push(showGalleryCommand);

	const provider = new ComponentGalleryViewProvider(context.extensionUri);
	const showGalleryProvider = window.registerWebviewViewProvider(ComponentGalleryViewProvider.viewType, provider)

	context.subscriptions.push(showGalleryProvider);
}
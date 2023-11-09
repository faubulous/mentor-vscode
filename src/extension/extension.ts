'use strict';
import { ExtensionContext, Uri, window, commands, env } from 'vscode';
import { SettingsPanel } from './panels/SettingsPanel';
import { SettingsViewProvider } from './panels/SettingsViewProvider';
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

	commands.registerCommand('mentor.command.selectClass', (uri: string) => classProvider.select(uri));
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

	commands.registerCommand('mentor.command.selectProperty', (uri: string) => propertyProvider.select(uri));
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

	commands.registerCommand('mentor.command.selectIndividual', (uri: string) => individualProvider.select(uri));
	commands.registerCommand('mentor.individualExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
	commands.registerCommand('mentor.individualExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
	commands.registerCommand('mentor.individualExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
	commands.registerCommand('mentor.individualExplorer.command.refreshEntry', () => classProvider.refresh());
	commands.registerCommand('mentor.individualExplorer.command.toggleReferenced', () => {
		individualProvider.toggleReferenced();
		individualProvider.refresh();
	});

	// Open the settings view via command
	const command = () => { SettingsPanel.render(context.extensionUri);	}
	const showGalleryCommand = commands.registerCommand("mentor.command.openSettings", command);

	context.subscriptions.push(showGalleryCommand);

	// Open the settings view as a webview; will use this for the tree view once React components are implemented.
	const settingsViewProvider = new SettingsViewProvider(context.extensionUri);
	const settingsDisposable = window.registerWebviewViewProvider(SettingsViewProvider.viewType, settingsViewProvider)

	context.subscriptions.push(settingsDisposable);
}
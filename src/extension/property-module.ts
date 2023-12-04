import { ExtensionContext, commands, window } from "vscode";
import { PropertyNodeProvider } from "./property-node-provider";

/**
 * Provides the property explorer and related commands.
 */
export class PropertyModule {
	static activate(context: ExtensionContext): void {
		const propertyProvider = new PropertyNodeProvider();
		window.registerTreeDataProvider('mentor.propertyExplorer', propertyProvider);
	
		commands.registerCommand('mentor.command.selectProperty', (uri: string) => propertyProvider.select(uri));
		commands.registerCommand('mentor.propertyExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
		commands.registerCommand('mentor.propertyExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
		commands.registerCommand('mentor.propertyExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
		commands.registerCommand('mentor.propertyExplorer.command.refreshEntry', () => propertyProvider.refresh());
		commands.registerCommand('mentor.propertyExplorer.command.toggleReferenced', () => {
			propertyProvider.toggleReferenced();
			propertyProvider.refresh();
		});
	}
}
import { ExtensionContext, commands, window } from "vscode";
import { ClassNodeProvider } from "./class-node-provider";

/**
 * Provides the class explorer and related commands.
 */
export class ClassModule {
	static activate(context: ExtensionContext): void {
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
	}
}
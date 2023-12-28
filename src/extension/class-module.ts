import { ExtensionContext, commands, window } from "vscode";
import { ClassNodeProvider } from "./class-node-provider";

/**
 * Provides the class explorer and related commands.
 */
export class ClassModule {
	static activate(context: ExtensionContext): void {
		const classProvider = new ClassNodeProvider();
		window.registerTreeDataProvider('mentor.view.classTree', classProvider);

		commands.executeCommand('setContext', 'classTree.showReferenced', classProvider.includeReferenced);

		commands.registerCommand('mentor.command.selectClass', (uri: string) => classProvider.select(uri));
		commands.registerCommand('mentor.classExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
		commands.registerCommand('mentor.classExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
		commands.registerCommand('mentor.classExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
		commands.registerCommand('mentor.classExplorer.command.refreshEntry', () => classProvider.refresh());

		commands.registerCommand('mentor.command.showReferencedClasses', () => {
			classProvider.includeReferenced = true;
			classProvider.refresh();

			commands.executeCommand('setContext', 'classTree.showReferenced', classProvider.includeReferenced);
		});

		commands.registerCommand('mentor.command.hideReferencedClasses', () => {
			classProvider.includeReferenced = false;
			classProvider.refresh();

			commands.executeCommand('setContext', 'classTree.showReferenced', classProvider.includeReferenced);
		});
	}
}
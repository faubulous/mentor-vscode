import { ExtensionContext, TreeView, commands, window, workspace } from "vscode";
import { ClassNodeProvider } from "./class-node-provider";

/**
 * Provides the class explorer and related commands.
 */
export class ClassModule {
	static updateItemCount(tree: TreeView<string>, provider: ClassNodeProvider) {
		tree.description = provider.getTotalItemCount() + " definitions";
	}

	static activate(context: ExtensionContext): void {
		const provider = new ClassNodeProvider();

		window.registerTreeDataProvider('mentor.view.classTree', provider);

		const tree = window.createTreeView('mentor.view.classTree', { treeDataProvider: provider, showCollapseAll: true });

		this.updateItemCount(tree, provider);
		
		workspace.onDidChangeTextDocument((e) => {
			if (e.document === provider.context?.document) {
				this.updateItemCount(tree, provider);
			}
		});

		commands.executeCommand('setContext', 'classTree.showReferenced', provider.includeReferenced);

		commands.registerCommand('mentor.command.selectClass', (uri: string) => provider.select(uri));
		commands.registerCommand('mentor.classExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
		commands.registerCommand('mentor.classExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
		commands.registerCommand('mentor.classExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
		commands.registerCommand('mentor.classExplorer.command.refreshEntry', () => provider.refresh());

		commands.registerCommand('mentor.command.showReferencedClasses', () => {
			provider.includeReferenced = true;
			provider.refresh();

			commands.executeCommand('setContext', 'classTree.showReferenced', provider.includeReferenced);
		});

		commands.registerCommand('mentor.command.hideReferencedClasses', () => {
			provider.includeReferenced = false;
			provider.refresh();

			commands.executeCommand('setContext', 'classTree.showReferenced', provider.includeReferenced);
		});
	}
}
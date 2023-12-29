import { ExtensionContext, TreeView, commands, window } from "vscode";
import { PropertyNodeProvider } from "./property-node-provider";
import { mentor } from "../mentor";

/**
 * Provides the property explorer and related commands.
 */
export class PropertyModule {
	static updateItemCount(tree: TreeView<string>, provider: PropertyNodeProvider) {
		tree.description = provider.getTotalItemCount() + " definitions";
	}

	static activate(context: ExtensionContext): void {
		const provider = new PropertyNodeProvider();
		
		window.registerTreeDataProvider('mentor.view.propertyTree', provider);

		const tree = window.createTreeView('mentor.view.propertyTree', { treeDataProvider: provider, showCollapseAll: true });

		this.updateItemCount(tree, provider);

		mentor.onDidChangeVocabularyContext((context) => {
			this.updateItemCount(tree, provider);
		});

		commands.registerCommand('mentor.command.selectProperty', (uri: string) => provider.select(uri));
		commands.registerCommand('mentor.propertyExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
		commands.registerCommand('mentor.propertyExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
		commands.registerCommand('mentor.propertyExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
		commands.registerCommand('mentor.propertyExplorer.command.refreshEntry', () => provider.refresh());
	}
}
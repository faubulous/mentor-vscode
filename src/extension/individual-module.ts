import { ExtensionContext, TreeView, commands, window, workspace } from "vscode";
import { IndividualNodeProvider } from "./individual-node-provider";

/**
 * Provides the individual explorer and related commands.
 */
export class IndividualModule {
	static updateItemCount(tree: TreeView<string>, provider: IndividualNodeProvider) {
		tree.description = provider.getTotalItemCount() + " definitions";
	}

	static activate(context: ExtensionContext): void {
		const provider = new IndividualNodeProvider();

		window.registerTreeDataProvider('mentor.view.individualTree', provider);

		const tree = window.createTreeView('mentor.view.individualTree', { treeDataProvider: provider, showCollapseAll: true });

		this.updateItemCount(tree, provider);

		workspace.onDidChangeTextDocument((e) => {
			if (e.document === provider.context?.document) {
				this.updateItemCount(tree, provider);
			}
		});
		commands.registerCommand('mentor.command.selectIndividual', (uri: string) => provider.select(uri));
		commands.registerCommand('mentor.individualExplorer.command.addEntry', () => window.showInformationMessage(`Successfully called add entry.`));
		commands.registerCommand('mentor.individualExplorer.command.editEntry', (node: string) => window.showInformationMessage(`Successfully called edit entry on ${node}.`));
		commands.registerCommand('mentor.individualExplorer.command.deleteEntry', (node: string) => window.showInformationMessage(`Successfully called delete entry on ${node}.`));
		commands.registerCommand('mentor.individualExplorer.command.refreshEntry', () => provider.refresh());
	}
}
import { ExtensionContext, TreeView, commands, window } from "vscode";
import { IndividualNodeProvider } from "./individual-node-provider";
import { mentor } from "../mentor";

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

		mentor.onDidChangeVocabularyContext((context) => {
			this.updateItemCount(tree, provider);
		});

		commands.registerCommand('mentor.command.individualTree.selectItem', (uri: string) => provider.select(uri));
		commands.registerCommand('mentor.command.individualTree.refresh', () => provider.refresh());
	}
}
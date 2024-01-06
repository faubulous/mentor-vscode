import { ExtensionContext, TreeView, commands, window } from "vscode";
import { ClassNodeProvider } from "./class-node-provider";
import { mentor } from "../mentor";

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

		mentor.onDidChangeVocabularyContext((context) => {
			this.updateItemCount(tree, provider);
		});

		commands.executeCommand('setContext', 'classTree.showReferenced', provider.showReferenced);

		commands.registerCommand('mentor.command.classTree.selectItem', (uri: string) => provider.select(uri));
		commands.registerCommand('mentor.command.classTree.refresh', () => provider.refresh());

		commands.registerCommand('mentor.command.classTree.showReferenced', () => {
			provider.showReferenced = true;
			provider.refresh();

			commands.executeCommand('setContext', 'classTree.showReferenced', provider.showReferenced);
		});

		commands.registerCommand('mentor.command.classTree.hideReferenced', () => {
			provider.showReferenced = false;
			provider.refresh();

			commands.executeCommand('setContext', 'classTree.showReferenced', provider.showReferenced);
		});
	}
}
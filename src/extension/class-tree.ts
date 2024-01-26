import { ExtensionContext, TreeView, commands, window } from "vscode";
import { ClassNodeProvider } from "./class-node-provider";
import { mentor } from "../mentor";

/**
 * Provides the class explorer and related commands.
 */
export class ClassTree {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.classTree";

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new ClassNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: TreeView<string>;

	/**
	 * Indicates class filtering should be applied when the selected node changes.
	 */
	filterEnabled: boolean = false;

	constructor(protected context: ExtensionContext) {
		window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = window.createTreeView(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this.updateItemCount();

		mentor.onDidChangeVocabularyContext(() => this.updateItemCount());

		this.registerCommands();
	}

	private registerCommands() {
		commands.registerCommand('mentor.action.refreshClassTree', () => {
			this.treeDataProvider.refresh();
		});

		commands.executeCommand('setContext', 'classTree.showReferenced', this.treeDataProvider.showReferenced);

		commands.registerCommand('mentor.action.showReferencedClasses', () => {
			this.treeDataProvider.showReferenced = true;
			this.treeDataProvider.refresh();

			commands.executeCommand('setContext', 'classTree.showReferenced', this.treeDataProvider.showReferenced);
		});

		commands.registerCommand('mentor.action.hideReferencedClasses', () => {
			this.treeDataProvider.showReferenced = false;
			this.treeDataProvider.refresh();

			commands.executeCommand('setContext', 'classTree.showReferenced', this.treeDataProvider.showReferenced);
		});
	}

	private updateItemCount() {
		this.treeView.description = this.treeDataProvider.getTotalItemCount() + " definitions";
	}
}
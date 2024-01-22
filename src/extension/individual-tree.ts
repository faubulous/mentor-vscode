import { ExtensionContext, TreeView, commands, window } from "vscode";
import { IndividualNodeProvider } from "./individual-node-provider";
import { mentor } from "../mentor";

/**
 * Provides the individual explorer and related commands.
 */
export class IndividualTree {
	/**
 * The ID which is used to register the view and make it visible in VS Code.
 */
	readonly id = "mentor.view.individualTree";

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new IndividualNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: TreeView<string>;

	constructor(context: ExtensionContext) {
		window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = window.createTreeView(this.id, { treeDataProvider: this.treeDataProvider, showCollapseAll: true });

		this.updateItemCount();

		mentor.onDidChangeVocabularyContext(() => this.updateItemCount());

		mentor.onDidChangeClassFilter((params) => {
			this.treeDataProvider.typeFilter = params.classUri;
			this.treeDataProvider.refresh();
		});

		this.registerCommands();
	}

	private registerCommands() {
		commands.registerCommand('mentor.command.refreshIndividualTree', () => {
			this.treeDataProvider.typeFilter = undefined;
			this.treeDataProvider.refresh();
		});

		commands.executeCommand('setContext', 'individualTree.showTypes', this.treeDataProvider.showTypes);

		commands.registerCommand('mentor.command.showIndividualTypes', () => {
			this.treeDataProvider.showTypes = true;
			this.treeDataProvider.refresh();

			commands.executeCommand('setContext', 'individualTree.showTypes', this.treeDataProvider.showTypes);
		});

		commands.registerCommand('mentor.command.hideIndividualTypes', () => {
			this.treeDataProvider.showTypes = false;
			this.treeDataProvider.refresh();

			commands.executeCommand('setContext', 'individualTree.showTypes', this.treeDataProvider.showTypes);
		});
	}

	private updateItemCount() {
		this.treeView.description = this.treeDataProvider.getTotalItemCount() + " definitions";
	}
}
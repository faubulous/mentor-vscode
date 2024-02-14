import * as vscode from "vscode";
import * as mentor from "../mentor";
import { IndividualNodeProvider } from "./individual-node-provider";

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
	readonly treeView: vscode.TreeView<string>;

	constructor(context: vscode.ExtensionContext) {
		vscode.window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = vscode.window.createTreeView(this.id, { treeDataProvider: this.treeDataProvider, showCollapseAll: true });

		this.updateItemCount();

		mentor.onDidChangeVocabularyContext(() => this.updateItemCount());

		this.registerCommands();
	}

	private registerCommands() {
		vscode.commands.executeCommand('setContext', 'viewType', 'treeView');
		
		vscode.commands.registerCommand('mentor.action.refreshIndividualTree', () => {
			this.treeDataProvider.refresh();
		});

		mentor.settings.set("view.showIndividualTypes", this.treeDataProvider.showTypes);
		mentor.settings.onDidChange("view.showIndividualTypes", (e) => {
			this.treeDataProvider.showTypes = e.newValue;
			this.treeDataProvider.refresh();
		});
	}

	private updateItemCount() {
		this.treeView.description = this.treeDataProvider.getTotalItemCount() + " definitions";
	}
}
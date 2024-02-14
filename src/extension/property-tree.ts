import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { PropertyNodeProvider } from "./property-node-provider";

/**
 * Provides the property explorer and related commands.
 */
export class PropertyTree {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.propertyTree";

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new PropertyNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<string>;

	constructor(readonly context: vscode.ExtensionContext) {
		vscode.window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = vscode.window.createTreeView(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this.updateItemCount();

		mentor.onDidChangeVocabularyContext((context) => this.updateItemCount());

		this.registerCommands();
	}

	private registerCommands() {
		vscode.commands.executeCommand('setContext', 'viewType', 'treeView');
		
		vscode.commands.registerCommand('mentor.action.refreshPropertyTree', () => {
			this.treeDataProvider.refresh();
		});

		mentor.settings.set("view.showPropertyTypes", this.treeDataProvider.showTypes);
		mentor.settings.onDidChange("view.showPropertyTypes", (e) => {
			this.treeDataProvider.showTypes = e.newValue;
			this.treeDataProvider.refresh();
		});
	}

	private updateItemCount() {
		this.treeView.description = this.treeDataProvider.getTotalItemCount() + " definitions";
	}
}
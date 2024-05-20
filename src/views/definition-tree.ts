import * as vscode from 'vscode';
import * as mentor from '../mentor'
import { TreeView } from './tree-view';
import { DefinitionNodeProvider } from './definition-node-provider';
import { DefinitionTreeNode } from './definition-tree-node';

/**
 * Provides a combined explorer for classes, properties and individuals.
 */
export class DefinitionTree implements TreeView {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.definitionTree";

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new DefinitionNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<DefinitionTreeNode>;

	constructor() {
		vscode.window.registerTreeDataProvider<DefinitionTreeNode>(this.id, this.treeDataProvider);

		this.treeView = vscode.window.createTreeView<DefinitionTreeNode>(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this.updateView();

		mentor.onDidChangeVocabularyContext(() => this.updateView());

		vscode.commands.executeCommand("setContext", "view.showReferences", this.treeDataProvider.showReferences);

		mentor.settings.onDidChange("view.showReferences", (e) => {
			vscode.commands.executeCommand("setContext", "view.showReferences", e.newValue);

			this.treeDataProvider.showReferences = e.newValue;
			this.treeDataProvider.refresh();
		});

		vscode.commands.executeCommand("setContext", "view.showPropertyTypes", this.treeDataProvider.showPropertyTypes);

		mentor.settings.onDidChange("view.showPropertyTypes", (e) => {
			vscode.commands.executeCommand("setContext", "view.showPropertyTypes", e.newValue);

			this.treeDataProvider.showPropertyTypes = e.newValue;
			this.treeDataProvider.refresh();
		});

		vscode.commands.executeCommand("setContext", "view.showIndividualTypes", this.treeDataProvider.showIndividualTypes);

		mentor.settings.onDidChange("view.showIndividualTypes", (e) => {
			vscode.commands.executeCommand("setContext", "view.showIndividualTypes", e.newValue);

			this.treeDataProvider.showIndividualTypes = e.newValue;
			this.treeDataProvider.refresh();
		});
	}

	private updateView() {
		if (!mentor.activeContext) {
			this.treeView.message = "No file selected.";
		} else {
			this.treeView.message = undefined;
		}
	}
}
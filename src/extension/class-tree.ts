import * as vscode from 'vscode';
import * as mentor from '../mentor'
import { ClassNodeProvider } from "./class-node-provider";
import { TreeView } from './tree-view';

/**
 * Provides the class explorer and related commands.
 */
export class ClassTree implements TreeView {
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
	readonly treeView: vscode.TreeView<string>;

	constructor(protected context: vscode.ExtensionContext) {
		vscode.window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = vscode.window.createTreeView(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this.updateItemCount();

		mentor.onDidChangeVocabularyContext(() => this.updateItemCount());

		this.registerCommands();
	}

	private registerCommands() {
		vscode.commands.registerCommand('mentor.action.refreshClassTree', () => {
			this.treeDataProvider.refresh();
		});

		vscode.commands.executeCommand('setContext', 'classTree.showReferenced', this.treeDataProvider.showReferenced);

		vscode.commands.registerCommand('mentor.action.showReferencedClasses', () => {
			this.treeDataProvider.showReferenced = true;
			this.treeDataProvider.refresh();

			vscode.commands.executeCommand('setContext', 'classTree.showReferenced', this.treeDataProvider.showReferenced);
		});

		vscode.commands.registerCommand('mentor.action.hideReferencedClasses', () => {
			this.treeDataProvider.showReferenced = false;
			this.treeDataProvider.refresh();

			vscode.commands.executeCommand('setContext', 'classTree.showReferenced', this.treeDataProvider.showReferenced);
		});
	}

	private updateItemCount() {
		this.treeView.description = this.treeDataProvider.getTotalItemCount() + " definitions";
	}
}
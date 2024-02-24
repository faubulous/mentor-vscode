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

		this.updateView();

		mentor.onDidChangeVocabularyContext(() => this.updateView());

		this.registerCommands();
	}

	private registerCommands() {
		vscode.commands.executeCommand('setContext', 'viewType', 'treeView');

		vscode.commands.registerCommand('mentor.action.refreshClassTree', () => {
			this.treeDataProvider.refresh();
		});

		mentor.settings.set("view.showReferencedClasses", this.treeDataProvider.showReferenced);
		mentor.settings.onDidChange("view.showReferencedClasses", (e) => {
			this.treeDataProvider.showReferenced = e.newValue;
			this.treeDataProvider.refresh();
		});
	}

	private updateView() {
		this.treeView.description = this.treeDataProvider.getTotalItemCount().toString();

		if(mentor.activeContext) {
			this.treeView.message = "No classes found.";
		} else {
			this.treeView.message = "No file selected.";
		}
	}
}
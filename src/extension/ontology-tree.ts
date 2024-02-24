import * as vscode from "vscode";
import * as mentor from "../mentor";
import { OntologyNodeProvider } from "./ontology-node-provider";

/**
 * Provides the ontology explorer and related commands.
 */
export class OntologyTree {
	/**
 * The ID which is used to register the view and make it visible in VS Code.
 */
	readonly id = "mentor.view.ontologyTree";

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new OntologyNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<string>;

	constructor(context: vscode.ExtensionContext) {
		vscode.window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = vscode.window.createTreeView(this.id, { treeDataProvider: this.treeDataProvider, showCollapseAll: true });

		vscode.commands.executeCommand('setContext', 'viewType', 'treeView');

		this.updateView();

		mentor.onDidChangeVocabularyContext(() => this.updateView());
	}

	private updateView() {
		this.treeView.description = this.treeDataProvider.getTotalItemCount().toString();
	}
}
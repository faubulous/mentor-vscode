import * as vscode from "vscode";
import * as mentor from "../mentor";
import { TreeView } from "./tree-view";

export abstract class ResourceTree implements TreeView {
	readonly id: string;

	readonly treeDataProvider: any;

	readonly treeView: any;

	abstract get noItemsMessage(): string;

	constructor(id: string, treeDataProvider: any) {
		this.id = id;
		this.treeDataProvider = treeDataProvider;

		vscode.window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = vscode.window.createTreeView(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this.updateView();

		mentor.onDidChangeVocabularyContext(() => this.updateView());

		this.registerCommands();
	}

	protected abstract registerCommands(): void;

	protected updateView() {
		const n = this.treeDataProvider.getTotalItemCount();

		this.treeView.description = n.toString();

		if (mentor.activeContext) {
			this.treeView.message = n == 0 ? this.noItemsMessage : undefined;
		} else {
			this.treeView.message = "No document selected.";
		}
	}
}
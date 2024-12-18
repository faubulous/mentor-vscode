import * as vscode from 'vscode';
import { mentor } from '../mentor'
import { TreeView } from './tree-view';
import { DefinitionNodeProvider } from './definition-node-provider';
import { DefinitionTreeNode } from './definition-tree-node';
import { DefinitionNodeDecorationProvider } from './definition-node-decoration-provider';

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
		this.updateViewTitle();

		mentor.onDidChangeVocabularyContext(() => {
			this.updateView();
			this.updateViewTitle();
		});

		vscode.commands.registerCommand('mentor.action.refreshDefinitionsTree', async () => {
			this.updateView();
			this.updateViewTitle();
		});

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

		// Update the view and the title when the active language changes.
		mentor.settings.onDidChange("view.activeLanguage", (e) => {
			this.updateViewTitle();

			this.treeDataProvider.refresh();
		});

		// Support for decorating missing language tags through a file decoration provider.
		vscode.window.registerFileDecorationProvider(new DefinitionNodeDecorationProvider());
	}

	/**
	 * Shows a message in the tree view if no file is selected.
	 */
	private updateView() {
		if (!mentor.activeContext) {
			this.treeView.message = "No file selected.";
		} else {
			this.treeView.message = undefined;
		}
	}

	/**
	 * Update the title of the tree view to include the active language.
	 */
	private updateViewTitle() {
		if (mentor.activeContext) {
			const title = this.treeView.title?.split(' - ')[0];
			const language = mentor.activeContext.activeLanguageTag;

			if (language) {
				this.treeView.title = `${title} - ${language}`;
			} else {
				this.treeView.title = title;
			}
		}
	}
}
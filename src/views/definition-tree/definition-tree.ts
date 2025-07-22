import * as vscode from 'vscode';
import { mentor } from '@/mentor'
import { TreeView } from '@/views/tree-view';
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

			this.treeDataProvider.refresh(mentor.activeContext);
		});

		const showReferences = mentor.settings.get('view.showReferences', true);

		vscode.commands.executeCommand("setContext", "view.showReferences", showReferences);
		vscode.commands.executeCommand("setContext", "view.showPropertyTypes", true);
		vscode.commands.executeCommand("setContext", "view.showIndividualTypes", true);

		// Update the view and the title when the active language changes.
		mentor.settings.onDidChange("view.activeLanguage", () => {
			this.updateViewTitle();
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
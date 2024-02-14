import * as vscode from 'vscode';
import * as mentor from '../mentor'
import { TreeView } from './tree-view';
import { TermNodeProvider } from './term-node-provider';
import { ClassNodeProvider } from './class-node-provider';
import { PropertyNodeProvider } from './property-node-provider';
import { IndividualNodeProvider } from './individual-node-provider';

/**
 * Provides a combined explorer for classes, properties and individuals.
 */
export class TermTree implements TreeView {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.combinedTree";

	/**
	 * The node provider for classes.
	 */
	readonly classProvider = new ClassNodeProvider();

	/**
	 * The node provider for properties.
	 */
	readonly propertyProvider = new PropertyNodeProvider();

	/**
	 * The node provider for invidiuals.
	 */
	readonly individualProvider = new IndividualNodeProvider();

	/**
	 * The tree node provider.
	 */
	readonly treeDataProvider = new TermNodeProvider(this.classProvider);

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
		vscode.commands.executeCommand('setContext', 'viewType', 'treeView');
		vscode.commands.executeCommand('setContext', 'itemType', 'class');

		this.treeView.title = 'Classes';

		vscode.commands.registerCommand('mentor.action.showClassTree', () => {
			this.treeView.title = 'Classes';
			this.treeDataProvider.setProvider(this.classProvider);

			vscode.commands.executeCommand('setContext', 'itemType', 'class');
		});

		vscode.commands.registerCommand('mentor.action.showClassTreeActive', () => {
			this.treeDataProvider.refresh();
		});

		vscode.commands.registerCommand('mentor.action.showPropertyTree', () => {
			this.treeView.title = 'Properties';
			this.treeDataProvider.setProvider(this.propertyProvider);

			vscode.commands.executeCommand('setContext', 'itemType', 'property');
		});

		vscode.commands.registerCommand('mentor.action.showPropertyTreeActive', () => {
			this.treeDataProvider.refresh();
		});

		vscode.commands.registerCommand('mentor.action.showIndividualTree', () => {
			this.treeView.title = 'Individuals';
			this.treeDataProvider.setProvider(this.individualProvider);

			vscode.commands.executeCommand('setContext', 'itemType', 'individual');
		});

		vscode.commands.registerCommand('mentor.action.showIndividualTreeActive', () => {
			this.treeDataProvider.refresh();
		});

		mentor.settings.onDidChange("view.showReferencedClasses", (e) => {
			this.classProvider.showReferenced = e.newValue;
			this.treeDataProvider.refresh();
		});

		mentor.settings.onDidChange("view.showPropertyTypes", (e) => {
			this.propertyProvider.showTypes = e.newValue;
			this.treeDataProvider.refresh();
		});

		mentor.settings.onDidChange("view.showIndividualTypes", (e) => {
			this.individualProvider.showTypes = e.newValue;
			this.treeDataProvider.refresh();
		});
	}

	private updateItemCount() {
		this.treeView.description = this.treeDataProvider.getTotalItemCount() + " definitions";
	}
}
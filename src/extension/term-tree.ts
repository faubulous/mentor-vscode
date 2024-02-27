import * as vscode from 'vscode';
import * as mentor from '../mentor'
import { TreeView } from './tree-view';
import { TermNodeProvider } from './term-node-provider';
import { ClassNodeProvider } from './class-node-provider';
import { PropertyNodeProvider } from './property-node-provider';
import { IndividualNodeProvider } from './individual-node-provider';
import { OntologyNodeProvider } from './ontology-node-provider';

/**
 * Provides a combined explorer for classes, properties and individuals.
 */
export class TermTree implements TreeView {
	/**
	 * The ID which is used to register the view and make it visible in VS Code.
	 */
	readonly id = "mentor.view.combinedTree";

	/**
	 * The node provider for ontologies.
	 */
	readonly ontologyProvider = new OntologyNodeProvider();

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
	readonly treeDataProvider = new TermNodeProvider();

	/**
	 * The tree view.
	 */
	readonly treeView: vscode.TreeView<string>;

	constructor(protected context: vscode.ExtensionContext) {
		this.treeDataProvider.registerProvider(this.ontologyProvider);
		this.treeDataProvider.registerProvider(this.classProvider);
		this.treeDataProvider.registerProvider(this.propertyProvider);
		this.treeDataProvider.registerProvider(this.individualProvider);

		vscode.window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = vscode.window.createTreeView(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this.updateView();

		mentor.onDidChangeVocabularyContext(() => this.updateView());

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

	private updateView() {
		if (!mentor.activeContext) {
			this.treeView.message = "No file selected.";
		} else if(!this.treeDataProvider.hasProviders()) {
			this.treeView.message = "No definition providers registered.";
		} else {
			this.treeView.message = undefined;
		}
	}
}
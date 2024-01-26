import { ExtensionContext, TreeView, commands, window } from "vscode";
import { PropertyNodeProvider } from "./property-node-provider";
import { mentor } from "../mentor";

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
	readonly treeView: TreeView<string>;

	constructor(readonly context: ExtensionContext) {
		window.registerTreeDataProvider(this.id, this.treeDataProvider);

		this.treeView = window.createTreeView(this.id, {
			treeDataProvider: this.treeDataProvider,
			showCollapseAll: true
		});

		this.updateItemCount();

		mentor.onDidChangeVocabularyContext((context) => this.updateItemCount());

		this.registerCommands();
	}

	private registerCommands() {
		commands.registerCommand('mentor.action.refreshPropertyTree', () => {
			this.treeDataProvider.refresh();
		});

		commands.executeCommand('setContext', 'propertyTree.showTypes', this.treeDataProvider.showTypes);

		commands.registerCommand('mentor.action.showPropertyTypes', () => {
			this.treeDataProvider.showTypes = true;
			this.treeDataProvider.refresh();

			commands.executeCommand('setContext', 'propertyTree.showTypes', this.treeDataProvider.showTypes);
		});

		commands.registerCommand('mentor.action.hidePropertyTypes', () => {
			this.treeDataProvider.showTypes = false;
			this.treeDataProvider.refresh();

			commands.executeCommand('setContext', 'propertyTree.showTypes', this.treeDataProvider.showTypes);
		});
	}

	private updateItemCount() {
		this.treeView.description = this.treeDataProvider.getTotalItemCount() + " definitions";
	}
}
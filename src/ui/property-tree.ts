import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { PropertyNodeProvider } from "./property-node-provider";
import { ResourceTree } from './resource-tree';

/**
 * Provides the property explorer and related commands.
 */
export class PropertyTree extends ResourceTree {
	get noItemsMessage(): string {
		return "No properties found.";
	}

	constructor() {
		super("mentor.view.propertyTree", new PropertyNodeProvider());
	}

	protected registerCommands() {
		vscode.commands.registerCommand('mentor.action.refreshPropertyTree', () => {
			this.treeDataProvider.refresh();
		});

		mentor.settings.set("view.showPropertyTypes", this.treeDataProvider.showTypes);
		mentor.settings.onDidChange("view.showPropertyTypes", (e) => {
			this.treeDataProvider.showTypes = e.newValue;
			this.treeDataProvider.refresh();
		});
	}
}
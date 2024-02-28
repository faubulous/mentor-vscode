import * as vscode from "vscode";
import * as mentor from "../mentor";
import { IndividualNodeProvider } from "./individual-node-provider";
import { ResourceTree } from "./resource-tree";

/**
 * Provides the individual explorer and related commands.
 */
export class IndividualTree extends ResourceTree {
	get noItemsMessage(): string {
		return "No individuals found.";
	}

	constructor() {
		super("mentor.view.individualTree", new IndividualNodeProvider());
	}

	protected registerCommands() {
		vscode.commands.registerCommand('mentor.action.refreshIndividualTree', () => {
			this.treeDataProvider.refresh();
		});

		mentor.settings.set("view.showIndividualTypes", this.treeDataProvider.showTypes);
		mentor.settings.onDidChange("view.showIndividualTypes", (e) => {
			this.treeDataProvider.showTypes = e.newValue;
			this.treeDataProvider.refresh();
		});
	}
}
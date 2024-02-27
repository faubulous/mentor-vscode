import * as vscode from 'vscode';
import * as mentor from '../mentor'
import { ClassNodeProvider } from "./class-node-provider";
import { ResourceTree } from './resource-tree';

/**
 * Provides the class explorer and related commands.
 */
export class ClassTree extends ResourceTree {
	get noItemsMessage(): string {
		return "No classes found.";
	}

	constructor() {
		super("mentor.view.classTree", new ClassNodeProvider());
	}

	protected registerCommands() {
		mentor.settings.set("view.showReferencedClasses", this.treeDataProvider.showReferenced);
		mentor.settings.onDidChange("view.showReferencedClasses", (e) => {
			this.treeDataProvider.showReferenced = e.newValue;
			this.treeDataProvider.refresh();
		});

		vscode.commands.registerCommand('mentor.action.refreshClassTree', () => {
			this.treeDataProvider.refresh();
		});
	}
}
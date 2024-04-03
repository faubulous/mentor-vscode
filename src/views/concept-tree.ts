import * as vscode from 'vscode';
import * as mentor from '../mentor'
import { ConceptNodeProvider } from "./concept-node-provider";
import { ResourceTree } from './resource-tree';

/**
 * Provides the concept explorer and related commands.
 */
export class ConceptTree extends ResourceTree {
	get noItemsMessage(): string {
		return "No concepts found.";
	}

	constructor() {
		super("mentor.view.conceptTree", new ConceptNodeProvider());
	}

	protected registerCommands() {
		vscode.commands.registerCommand('mentor.action.refreshConceptTree', () => {
			this.treeDataProvider.refresh();
		});
	}
}
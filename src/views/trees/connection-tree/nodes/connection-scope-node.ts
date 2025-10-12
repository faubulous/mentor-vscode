import * as vscode from 'vscode';
import { getConfigurationTargetLabel } from '@src/services/sparql-connection';
import { TreeNodeBase } from '@src/views/trees/tree-node';

/**
 * Represents a configuration scope (config target) or SPARQL connection in the connection tree.
 */
export class ConnectionScopeNode extends TreeNodeBase {

	/**
	 * The default collapsible state of the tree item.
	 */
	initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;

	constructor(context: vscode.ConfigurationTarget) {
		super();

		this.id = context.toString();
		this.label = getConfigurationTargetLabel(context);
	}

	/**
	 * Get a value that can be accessed in `package.json` for the context menu.
	 * @returns A string that represents the context value of the tree item.
	 */
	getContextValue(): string {
		return 'connectionScope';
	}

	/**
	 * Get the label of the tree item.
	 * @returns The label of the tree item.
	 */
	getLabel(): vscode.TreeItemLabel {
		return { label: this.label };
	}

	/**
	 * Get the description of the tree item.
	 * @returns A description string or `undefined` if no description should be shown.
	 */
	getDescription(): string {
		return '';
	}
}
import * as vscode from 'vscode';
import { TreeNodeBase } from '@src/views/trees/tree-node';
import {
	ConfigurationScope,
	getConfigurationScopeLabel,
	getConfigurationScopeDescription
} from '@src/utilities/config-scope';

/**
 * Represents a configuration scope (config target) or SPARQL connection in the connection tree.
 */
export class ConnectionScopeNode extends TreeNodeBase {

	/**
	 * The default collapsible state of the tree item.
	 */
	initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;

	/**
	 * The configuration scope represented by this node.
	 */
	scope: ConfigurationScope;

	constructor(scope: ConfigurationScope) {
		super();

		this.id = scope.toString();
		this.scope = scope;
	}

	getContextValue(): string {
		return 'connectionScope';
	}

	getLabel(): vscode.TreeItemLabel {
		return { label: getConfigurationScopeLabel(this.scope) };
	}

	getTooltip(): vscode.MarkdownString | undefined {
		const description = getConfigurationScopeDescription(this.scope);

		if (description) {
			return new vscode.MarkdownString(description);
		}
	}
}
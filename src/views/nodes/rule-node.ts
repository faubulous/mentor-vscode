import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";
import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RuleNode extends ResourceNode {
	contextType = SH.Rule;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Rules";

	override getIcon() {
		return new vscode.ThemeIcon('rdf-class', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getResourceUri(): vscode.Uri | undefined {
		return undefined;
	}

	override getChildren(): DefinitionTreeNode[] {
		const document = this.document;

		const options = { ...this.options };
		options.notDefinedBy?.add(_SH);

		return this.getChildrenOfType([_SH, ...document.graphs], this, SH.Rule, (uri) => new RuleNode(document, this.id + `/<${uri}>`, uri, this.options));
	}
}
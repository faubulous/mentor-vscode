import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ResourceNode } from "./resource-node";

/**
 * Node of a SHACL validator in the definition tree.
 */
export class ValidatorNode extends ResourceNode {
	contextType = SH.Validator;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

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

		return this.getChildrenOfType([_SH, ...document.graphs], this, SH.Validator, (uri) => new ValidatorNode(document, this.id + `/<${uri}>`, uri, this.options));
	}
}
import * as vscode from "vscode";
import { _SH } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Node of a SHACL validator in the definition tree.
 */
export class ValidatorNode extends DefinitionTreeNode {
	override getIcon() {
		return new vscode.ThemeIcon('rdf-class', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getResourceUri(): vscode.Uri | undefined {
		return undefined;
	}
}
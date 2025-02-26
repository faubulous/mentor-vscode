import * as vscode from "vscode";
import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Node of a class instance in the definition tree.
 */
export class IndividualNode extends DefinitionTreeNode {
	override getIcon() {
		return new vscode.ThemeIcon('rdf-individual', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.individual");
	}
}
import * as vscode from "vscode";
import { OWL } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Node of a class instance in the definition tree.
 */
export class IndividualNode extends DefinitionTreeNode {
	contextType = OWL.NamedIndividual;

	override getIcon() {
		return new vscode.ThemeIcon('rdf-individual', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.individual");
	}
}
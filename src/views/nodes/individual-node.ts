import * as vscode from "vscode";
import { OWL } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

/**
 * Node of a class instance in the definition tree.
 */
export class IndividualNode extends ResourceNode {
	contextType = OWL.NamedIndividual;

	override getIcon() {
		return new vscode.ThemeIcon('rdf-individual', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.individual");
	}
}
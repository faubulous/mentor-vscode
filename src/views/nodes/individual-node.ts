import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { OWL } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

export class IndividualNode extends ResourceNode {
	contextType = OWL.NamedIndividual;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Individuals";

	override getIcon() {
		if (this.uri) {
			return new vscode.ThemeIcon('rdf-individual', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.individual");
	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			result += " " + mentor.vocabulary.getIndividuals(this.document.graphs, undefined, this.options).length.toString();
		}

		return result;
	}
}
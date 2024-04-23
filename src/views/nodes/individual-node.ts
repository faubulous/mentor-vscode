import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { ResourceNode } from "./resource-node";
import { OWL } from "@faubulous/mentor-rdf";

export class IndividualNode extends ResourceNode {
	type = OWL.NamedIndividual;

	override getIcon() {
		if (this.uri) {
			return new vscode.ThemeIcon('rdf-individual', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.individual");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Individuals"
			}
		} else {
			return {
				label: this.context.getResourceLabel(this.uri)
			}
		}

	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			result += mentor.vocabulary.getIndividuals(this.context.graphs, undefined, this.options).length.toString();
		}

		return result;
	}

	override getCollapsibleState(): vscode.TreeItemCollapsibleState {
		if (this.uri || mentor.vocabulary.getIndividuals(this.context.graphs, undefined, this.options).length == 0) {
			return vscode.TreeItemCollapsibleState.None;
		} else {
			return vscode.TreeItemCollapsibleState.Collapsed;
		}
	}
}
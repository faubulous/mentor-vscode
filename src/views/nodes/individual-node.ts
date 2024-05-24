import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { OWL, DefinitionQueryOptions } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";
import { DocumentContext } from "../../document-context";

export class IndividualNode extends ResourceNode {
	contextType = OWL.NamedIndividual;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
	
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
				label: this.document.getResourceLabel(this.uri)
			}
		}

	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			result += mentor.vocabulary.getIndividuals(this.document.graphs, undefined, this.options).length.toString();
		}

		return result;
	}
}
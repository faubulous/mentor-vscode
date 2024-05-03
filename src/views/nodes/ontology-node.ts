import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { ResourceNode } from "./resource-node";
import { OWL } from "@faubulous/mentor-rdf";

export class OntologyNode extends ResourceNode {
	contextType = OWL.Ontology;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	isReferenced = false;

	override getIcon() {
		if (this.isReferenced) {
			return new vscode.ThemeIcon('rdf-ontology-ref', this.getIconColor());
		} else {
			return new vscode.ThemeIcon('rdf-ontology', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "unkown"
			}
		} else {
			return {
				label: this.context.getResourceLabel(this.uri)
			}
		}
	}

	override getDescription(): string {
		let result = "";

		if (this.uri) {
			const version = mentor.vocabulary.getOntologyVersionInfo(this.context.graphs, this.uri);

			if (version) {
				result += version;
			}
		}

		return result;
	}
}
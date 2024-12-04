import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { OWL } from "@faubulous/mentor-rdf";

export class OntologyNode extends ResourceNode {
	contextType = OWL.Ontology;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "unknown";

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

	override getDescription(): string {
		let result = super.getDescription();

		if (this.uri) {
			const version = mentor.vocabulary.getOntologyVersionInfo(this.document.graphs, this.uri);

			if (version) {
				result += " " + version;
			}
		}

		return result;
	}
}
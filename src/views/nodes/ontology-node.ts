import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { ResourceNode } from "./resource-node";
import { OWL } from "@faubulous/mentor-rdf";

export class OntologyNode extends ResourceNode {
	type = OWL.Ontology;

	override getIcon() {
		return new vscode.ThemeIcon('rdf-ontology', this.getIconColor());
	}

	override getIconColor() {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Unspecified"
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

	override getCollapsibleState(): vscode.TreeItemCollapsibleState {
		return vscode.TreeItemCollapsibleState.Collapsed;
	}
}
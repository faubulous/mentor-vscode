import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { ResourceNode } from "./resource-node";
import { SKOS } from "@faubulous/mentor-rdf";

export class ConceptSchemeNode extends ResourceNode {
	contextType = SKOS.ConceptScheme;

	override getIcon() {
		return new vscode.ThemeIcon('rdf-concept-scheme', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Concept Schemes"
			}
		} else {
			return {
				label: this.context.getResourceLabel(this.uri)
			}
		}
	}

	override getCollapsibleState(): vscode.TreeItemCollapsibleState {
		if (this.uri && !mentor.vocabulary.hasNarrowerConcepts(this.context.graphs, this.uri)) {
			return vscode.TreeItemCollapsibleState.None;
		} else {
			return vscode.TreeItemCollapsibleState.Expanded;
		}
	}
}
import * as vscode from "vscode";
import { ResourceNode } from "./resource-node";
import { SKOS } from "@faubulous/mentor-rdf";

export class ConceptSchemeNode extends ResourceNode {
	contextType = SKOS.ConceptScheme;

	defaultLabel = "Concept Schemes";

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getIcon() {
		return new vscode.ThemeIcon('rdf-concept-scheme', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}
}
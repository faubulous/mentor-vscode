import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { SKOS } from "@faubulous/mentor-rdf";

export class ConceptNode extends ResourceNode {
	contextType = SKOS.Concept;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Concepts";

	override getIcon() {
		return this.uri ? new vscode.ThemeIcon('rdf-concept', this.getIconColor()) : undefined;
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override getDescription(): string {
		let result = super.getDescription();

		if (!this.uri) {
			const members = mentor.vocabulary.getConcepts(this.document.graphs);

			result += " " + members.length.toString();
		}

		return result;
	}
}
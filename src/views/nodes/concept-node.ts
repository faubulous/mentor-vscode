import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { SKOS } from "@faubulous/mentor-rdf";

export class ConceptNode extends ResourceNode {
	contextType = SKOS.Concept;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getIcon() {
		return this.uri ? new vscode.ThemeIcon('rdf-concept', this.getIconColor()) : undefined;
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Concepts"
			}
		} else {
			return {
				label: this.document.getResourceLabel(this.uri)
			}
		}
	}

	override getDescription(): string | undefined {
		if (!this.uri) {
			const members = mentor.vocabulary.getConcepts(this.document.graphs);

			return " " + members.length.toString();
		}
	}
}
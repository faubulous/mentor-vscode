import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { ResourceNode } from "./resource-node";
import { SKOS } from "@faubulous/mentor-rdf";

export class ConceptNode extends ResourceNode {
	contextType = SKOS.Concept;

	override getIcon() {
		return this.uri ? new vscode.ThemeIcon('rdf-concept', this.getIconColor()) : undefined;
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Concepts"
			}
		} else {
			return {
				label: this.context.getResourceLabel(this.uri)
			}
		}
	}

	override getDescription(): string | undefined {
		if (!this.uri) {
			const members = mentor.vocabulary.getConcepts(this.context.graphs);

			return members.length.toString();
		}
	}
}
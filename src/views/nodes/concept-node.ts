import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { SKOS } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";

/**
 * Node of a SKOS concept in the definition tree.
 */
export class ConceptNode extends DefinitionTreeNode {
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

	override getChildren(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		let subject = this.uri;

		if (!subject && this.options?.definedBy) {
			subject = this.options.definedBy;
		}

		const result = [];

		for (let c of mentor.vocabulary.getNarrowerConcepts(this.document.graphs, subject)) {
			result.push(new ConceptNode(this.document, this.id + `/<${c}>`, c, this.options));
		}

		return sortByLabel(result);
	}
}
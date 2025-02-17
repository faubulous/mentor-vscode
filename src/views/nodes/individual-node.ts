import * as vscode from "vscode";
import { OWL } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ResourceNode } from "./resource-node";
import { ClassNode } from "./class-node";

/**
 * Node of a class instance in the definition tree.
 */
export class IndividualNode extends ResourceNode {
	contextType = OWL.NamedIndividual;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Individuals";

	override getIcon() {
		if (this.uri) {
			return new vscode.ThemeIcon('rdf-individual', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.individual");
	}

	override getDescription(): string {
		let result = super.getDescription();

		if (!this.uri) {
			result += " " + mentor.vocabulary.getIndividuals(this.document.graphs, undefined, this.options).length.toString();
		}

		return result;
	}

	override getChildren(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		const result = [];

		if (this.contextValue === "individuals" && this.showIndividualTypes) {
			const types = mentor.vocabulary.getIndividualTypes(this.document.graphs, undefined, this.options);

			for (let t of types) {
				const n = new ClassNode(this.document, this.id + `/<${t}>`, t, this.options);
				n.contextType = OWL.NamedIndividual;

				result.push(n);
			}
		} else {
			const individuals = mentor.vocabulary.getIndividuals(this.document.graphs, this.uri, this.options);

			for (let x of individuals) {
				result.push(new IndividualNode(this.document, this.id + `/<${x}>`, x, this.options));
			}
		}

		return sortByLabel(result);
	}
}
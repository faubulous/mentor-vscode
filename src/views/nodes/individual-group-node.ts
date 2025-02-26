import * as vscode from "vscode";
import { OWL } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { IndividualNode } from "./individual-node";
import { IndividualClassNode } from "./individual-class-node";

/**
 * Node of a class instance in the definition tree.
 */
export class IndividualGroupNode extends DefinitionTreeNode {
	contextType = OWL.NamedIndividual;

	contextValue = "individuals";

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getLabel(): vscode.TreeItemLabel {
		return { label: "Individuals" };
	}

	override getDescription(): string {
		const individuals = mentor.vocabulary.getIndividuals(this.document.graphs, undefined, this.options);

		return individuals.length.toString();
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const showIndividualTypes = mentor.settings.get<boolean>('view.showIndividualTypes', true);

		if (showIndividualTypes) {
			const types = mentor.vocabulary.getIndividualTypes(this.document.graphs, undefined, this.options);

			for (let t of types) {
				result.push(new IndividualClassNode(this.document, this.id + `/<${t}>`, t, this.options));
			}
		} else {
			const individuals = mentor.vocabulary.getIndividuals(this.document.graphs, this.uri, this.options);

			for (let i of individuals) {
				result.push(new IndividualNode(this.document, this.id + `/<${i}>`, i, this.options));
			}
		}

		return sortByLabel(result);
	}
}
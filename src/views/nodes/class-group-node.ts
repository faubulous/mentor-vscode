import * as vscode from "vscode";
import { RDFS } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ClassNode } from "./class-node";

/**
 * Node of a RDFS or OWL class in the definition tree.
 */
export class ClassGroupNode extends ResourceNode {
	contextType = RDFS.Class;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getLabel(): vscode.TreeItemLabel {
		return { label: "Classes" };
	}

	override getDescription(): string {
		const classes = mentor.vocabulary.getClasses(this.document.graphs, this.options);

		return classes.length.toString();
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const classes = mentor.vocabulary.getSubClasses(this.document.graphs, undefined, this.options);

		for (let c of classes) {
			result.push(new ClassNode(this.document, this.id + `/<${c}>`, c, this.options));
		}

		return sortByLabel(result);
	}
}
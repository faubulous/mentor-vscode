import * as vscode from "vscode";
import { RDF } from '@faubulous/mentor-rdf';
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { ClassNode } from "./class-node";
import { PropertyNode } from "./property-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertyClassNode extends ClassNode {
	contextType = RDF.Property;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const properties = mentor.vocabulary.getRootPropertiesOfType(this.document.graphs, this.uri!, this.options);

		for (const p of properties) {
			result.push(new PropertyNode(this.document, this.id + `/<${p}>`, p, this.options));
		}

		return sortByLabel(result);
	}
}
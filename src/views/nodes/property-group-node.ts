import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { RDF } from '@faubulous/mentor-rdf';
import { ResourceNode } from "./resource-node";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { PropertyNode } from "./property-node";
import { PropertyClassNode } from "./property-class-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertyGroupNode extends ResourceNode {
	contextType = RDF.Property;

	contextValue = "properties";

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getLabel(): vscode.TreeItemLabel {
		return { label: "Properties" };
	}

	override getDescription(): string {
		const properties = mentor.vocabulary.getProperties(this.document.graphs, this.options);

		return properties.length.toString();
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const showPropertyTypes = mentor.settings.get<boolean>('view.showPropertyTypes', true);

		if (showPropertyTypes) {
			const types = mentor.vocabulary.getPropertyTypes(this.document.graphs, this.options);

			for (let type of types) {
				result.push(new PropertyClassNode(this.document, this.id + `/<${type}>`, type, this.options));
			}
		} else {
			const properties = mentor.vocabulary.getSubProperties(this.document.graphs, this.uri, this.options);

			for (let p of properties) {
				result.push(new PropertyNode(this.document, this.id + `/<${p}>`, p, this.options));
			}
		}

		return sortByLabel(result);
	}
}
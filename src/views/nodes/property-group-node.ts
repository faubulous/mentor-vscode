import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { PropertyNode } from "./property-node";
import { PropertyClassNode } from "./property-class-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertyGroupNode extends PropertyClassNode {
	contextValue = "properties";

	override getLabel(): vscode.TreeItemLabel {
		return { label: "Properties" };
	}

	override getDescription(): string {
		const properties = mentor.vocabulary.getProperties(this.getDocumentGraphs(), this.getQueryOptions());

		return properties.length.toString();
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const showPropertyTypes = mentor.settings.get<boolean>('view.showPropertyTypes', true);

		if (showPropertyTypes) {
			const types = mentor.vocabulary.getPropertyTypes(this.getOntologyGraphs(), this.getQueryOptions());

			for (let type of types) {
				result.push(new PropertyClassNode(this.document, this.id + `/<${type}>`, type, this.getQueryOptions()));
			}
		} else {
			const properties = mentor.vocabulary.getSubProperties(this.getDocumentGraphs(), this.uri, this.getQueryOptions());

			for (let p of properties) {
				result.push(new PropertyNode(this.document, this.id + `/<${p}>`, p, this.getQueryOptions()));
			}
		}

		return sortByLabel(result);
	}
}
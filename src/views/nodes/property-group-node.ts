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

	override getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: "Properties" };
	}

	override getDescription(): string {
		const properties = mentor.vocabulary.getProperties(this.getDocumentGraphs(), this.getQueryOptions());

		return properties.length.toString();
	}

	override getChildren(): DefinitionTreeNode[] {
		const result = [];
		const showPropertyTypes = mentor.settings.get('view.showPropertyTypes', true);

		if (showPropertyTypes) {
			const types = mentor.vocabulary.getPropertyTypes(this.getOntologyGraphs(), this.getQueryOptions());

			for (let type of types) {
				result.push(this.createChildNode(PropertyClassNode, type));
			}
		} else {
			const properties = mentor.vocabulary.getSubProperties(this.getDocumentGraphs(), this.uri, this.getQueryOptions());

			for (let p of properties) {
				result.push(this.createChildNode(PropertyNode, p));
			}
		}

		return sortByLabel(result);
	}
}
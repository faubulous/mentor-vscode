import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { ResourceNode } from "./resource-node";
import { SKOS } from "@faubulous/mentor-rdf";

export class CollectionNode extends ResourceNode {
	contextType = SKOS.Collection;

	override getIcon() {
		if (this.uri) {
			let isOrdered = mentor.vocabulary.isOrderedCollection(this.context.graphs, this.uri);

			return new vscode.ThemeIcon(isOrdered ? 'rdf-collection-ordered' : 'rdf-collection', this.getIconColor());
		} else {
			return undefined;
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Collections"
			}
		} else {
			return {
				label: this.context.getResourceLabel(this.uri)
			}
		}
	}

	override getDescription(): string | undefined {
		if (!this.uri) {
			const members = mentor.vocabulary.getCollections(this.context.graphs);

			return members.length.toString();
		}
	}

	override getCollapsibleState(): vscode.TreeItemCollapsibleState {
		if (this.uri && mentor.vocabulary.hasCollectionMembers(this.context.graphs, this.uri)) {
			return vscode.TreeItemCollapsibleState.Collapsed;
		} else if (!this.uri && mentor.vocabulary.getCollections(this.context.graphs).length > 0) {
			return vscode.TreeItemCollapsibleState.Collapsed;
		} else {
			return vscode.TreeItemCollapsibleState.None;
		}
	}
}
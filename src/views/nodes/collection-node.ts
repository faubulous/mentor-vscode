import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { SKOS } from "@faubulous/mentor-rdf";

export class CollectionNode extends ResourceNode {
	contextType = SKOS.Collection;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getIcon() {
		if (this.uri) {
			let isOrdered = mentor.vocabulary.isOrderedCollection(this.document.graphs, this.uri);

			return new vscode.ThemeIcon(isOrdered ? 'rdf-collection-ordered' : 'rdf-collection', this.getIconColor());
		} else {
			return undefined;
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Collections"
			}
		} else {
			return {
				label: this.document.getResourceLabel(this.uri)
			}
		}
	}

	override getDescription(): string | undefined {
		if (!this.uri) {
			const members = mentor.vocabulary.getCollections(this.document.graphs);

			return members.length.toString();
		}
	}
}
import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { SKOS } from "@faubulous/mentor-rdf";

export class CollectionNode extends ResourceNode {
	contextType = SKOS.Collection;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Collections";

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

	override getDescription(): string {
		let result = super.getDescription();

		if (!this.uri) {
			const members = mentor.vocabulary.getCollections(this.document.graphs);

			result + " " + members.length.toString();
		}

		return result;
	}
}
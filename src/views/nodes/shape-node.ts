import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { SHACL } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

export class ShapeNode extends ResourceNode {
	contextType = SHACL.Shape;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getIcon() {
		if (this.uri) {
			let icon = 'rdf-shape-node';

			if (mentor.vocabulary.hasType(this.document.graphs, this.uri, SHACL.PropertyShape, { includeInferred: true })) {
				icon = 'rdf-shape-property';
			}

			return new vscode.ThemeIcon(icon, this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Shapes"
			}
		} else {
			return {
				label: this.document.getResourceLabel(this.uri)
			}
		}
	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			result += mentor.vocabulary.getShapes(this.document.graphs).length.toString();
		}

		return result;
	}
}
import * as vscode from "vscode";
import { mentor } from "../../mentor";
import * as n3 from "n3";
import { SH } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";
import { ClassNode } from "./class-node";
import { PropertyNode } from "./property-node";

export class ShapeNode extends ResourceNode {
	contextType = SH.Shape;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Shapes";

	override getIcon() {
		if (this.uri) {
			// TODO: Fix #10 in mentor-rdf
			const id = this.uri.includes(':') ? new n3.NamedNode(this.uri) : new n3.BlankNode(this.uri);
			const targets = mentor.vocabulary.getShapeTargets(this.document.graphs, id);

			if (mentor.vocabulary.hasType(this.document.graphs, this.uri, SH.Parameter, { includeInferred: true })) {
				return new vscode.ThemeIcon('mention', this.getIconColor());
			} else if (mentor.vocabulary.hasType(this.document.graphs, this.uri, SH.PropertyShape, { includeInferred: true })) {
				// Return the first shape target property icon.
				for (let t of targets) {
					const rangeUri = PropertyNode.getRangeUri(this.document.graphs, t);

					return PropertyNode.getIcon(this.document.graphs, t, rangeUri);
				}

				return new vscode.ThemeIcon('rdf-shape-property', this.getIconColor());
			} else {
				// Return the first shape target class icon.
				for (let t of targets) {
					return ClassNode.getIcon(this.document.graphs, t);
				}

				// Return the ref class icon if target cannot be found.
				return new vscode.ThemeIcon('rdf-class-ref', this.getIconColor());
			}
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			result += " " + mentor.vocabulary.getShapes(this.document.graphs, undefined, { includeBlankNodes: true }).length.toString();
		}

		return result;
	}

	override getResourceUri(): vscode.Uri | undefined {
		return undefined;
	}
}
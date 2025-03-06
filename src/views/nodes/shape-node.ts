import * as vscode from "vscode";
import * as n3 from "n3";
import { _SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ClassNode } from "./class-node";
import { PropertyNode } from "./property-node";

export class NodeShapeNode extends ClassNode {
	override getIcon() {
		let classIri: string | undefined;

		if (this.uri) {
			const u = this.uri.includes(':') ? new n3.NamedNode(this.uri) : new n3.BlankNode(this.uri);
			const targets = mentor.vocabulary.getShapeTargets(this.getDocumentGraphs(), u);

			for (let t of targets) {
				classIri = t;
				break;
			}
		}

		const iconName = this.getIconNameFromClass(classIri);
		const iconColor = this.getIconColorFromClass(classIri);

		return new vscode.ThemeIcon(iconName, iconColor);
	}
}

export class PropertyShapeNode extends PropertyNode {
	override getIcon() {
		let rangeIri: string | undefined;

		if (this.uri) {
			const id = this.uri.includes(':') ? new n3.NamedNode(this.uri) : new n3.BlankNode(this.uri);
			const targets = mentor.vocabulary.getShapeTargets(this.getDocumentGraphs(), id);

			for (const target of targets) {
				rangeIri = this.getRange(target);
				break;
			}
		}

		const iconName = this.getIconNameFromRange(rangeIri);
		const iconColor = this.getIconColorFromRange(rangeIri);

		return new vscode.ThemeIcon(iconName, iconColor);
	}

	override getChildren() {
		return [];
	}
}

export class ParameterNode extends DefinitionTreeNode {
	override getIcon() {
		return new vscode.ThemeIcon('mention', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}
}

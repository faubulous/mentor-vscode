import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { ResourceNode } from "./resource-node";
import { RDFS } from "@faubulous/mentor-rdf";

export class ClassNode extends ResourceNode {
	type = RDFS.Class;

	override getIcon() {
		if (this.uri) {
			let icon = 'rdf-class';

			if (!mentor.vocabulary.hasSubject(this.context.graphs, this.uri)) {
				icon += '-ref';
			}

			if (mentor.vocabulary.hasIndividuals(this.context.graphs, this.uri)) {
				icon += "-i";
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
				label: "Classes"
			}
		} else {
			return {
				label: this.context.getResourceLabel(this.uri)
			}
		}
	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			result += mentor.vocabulary.getClasses(this.context.graphs, this.options).length.toString();
		} else {
			if (mentor.vocabulary.hasEquivalentClass(this.context.graphs, this.uri)) {
				result += "≡";
			}

			// if (mentor.vocabulary.isIntersectionOfClasses(this.context.graphs, this.uri)) {
			// 	result += "⋂";
			// } else if (mentor.vocabulary.isUnionOfClasses(this.context.graphs, this.uri)) {
			// 	result += "⋃";
			// } else if (mentor.vocabulary.hasEquivalentClass(this.context.graphs, this.uri)) {
			// 	result += "≡";
			// }
		}

		return result;
	}

	override getCollapsibleState(): vscode.TreeItemCollapsibleState {
		if (mentor.vocabulary.getSubClasses(this.context.graphs, this.uri, this.options).length > 0) {
			return vscode.TreeItemCollapsibleState.Collapsed;
		} else {
			return vscode.TreeItemCollapsibleState.None;
		}
	}
}
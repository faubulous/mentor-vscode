import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { RDFS } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

export class ClassNode extends ResourceNode {
	contextType = RDFS.Class;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getIcon() {
		if (this.uri) {
			let icon = 'rdf-class';

			if (!mentor.vocabulary.hasSubject(this.document.graphs, this.uri)) {
				icon += '-ref';
			}

			if (mentor.vocabulary.hasIndividuals(this.document.graphs, this.uri)) {
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
				label: this.document.getResourceLabel(this.uri)
			}
		}
	}

	override getDescription(): string {
		let result = "";

		if (!this.uri) {
			result += mentor.vocabulary.getClasses(this.document.graphs, this.options).length.toString();
		} else {
			let indicators = [];

			if (mentor.vocabulary.hasEquivalentClass(this.document.graphs, this.uri)) {
				indicators.push("≡");
			}

			// if (mentor.vocabulary.isIntersectionOfClasses(this.context.graphs, this.uri)) {
			// 	indicators.push("⋂");
			// } else if (mentor.vocabulary.isUnionOfClasses(this.context.graphs, this.uri)) {
			// 	indicators.push("⋃");
			// } else if (mentor.vocabulary.hasEquivalentClass(this.context.graphs, this.uri)) {
			// 	indicators.push("≡");
			// }

			if(mentor.vocabulary.hasShapes(this.document.graphs, this.uri)) {
				indicators.push("S");
			}

			result += indicators.join(" ");
		}

		return result;
	}
}
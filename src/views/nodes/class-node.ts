import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { RDFS } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

export class ClassNode extends ResourceNode {
	contextType = RDFS.Class;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getIcon() {
		return ClassNode.getIcon(this.document.graphs, this.uri);
	}

	static getIcon(graphUris: string | string[] | undefined, subjectUri: string | undefined): vscode.ThemeIcon | undefined {
		if (subjectUri) {
			let icon = 'rdf-class';

			if (!mentor.vocabulary.hasSubject(graphUris, subjectUri)) {
				icon += '-ref';
			}

			if (mentor.vocabulary.hasIndividuals(graphUris, subjectUri)) {
				icon += "-i";
			}

			return new vscode.ThemeIcon(icon, ClassNode.getIconColor(graphUris, subjectUri));
		}
	}
	
	override getIconColor() {
		return ClassNode.getIconColor(this.document.graphs, this.uri);
	}

	static getIconColor(graphUris: string | string[] | undefined, subjectUri: string | undefined): vscode.ThemeColor {
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
			result += " " + mentor.vocabulary.getClasses(this.document.graphs, this.options).length.toString();
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

			result += indicators.join(" ");
		}

		return result;
	}
}
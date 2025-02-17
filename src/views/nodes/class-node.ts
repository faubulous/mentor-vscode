import * as vscode from "vscode";
import { RDFS } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";

/**
 * Node of a RDFS or OWL class in the definition tree.
 */
export class ClassNode extends ResourceNode {
	contextType = RDFS.Class;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Classes";

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

	override getDescription(): string {
		let result = super.getDescription();

		if (!this.uri) {
			result += " " + mentor.vocabulary.getClasses(this.document.graphs, this.options).length.toString();
		} else {
			let indicators = [];

			if (mentor.vocabulary.hasEquivalentClass(this.document.graphs, this.uri)) {
				indicators.push("≡");
			}

			// if (mentor.vocabulary.isIntersectionOfClasses(this.document.graphs, this.uri)) {
			// 	indicators.push("⋂");
			// } else if (mentor.vocabulary.isUnionOfClasses(this.document.graphs, this.uri)) {
			// 	indicators.push("⋃");
			// } else if (mentor.vocabulary.hasEquivalentClass(this.document.graphs, this.uri)) {
			// 	indicators.push("≡");
			// }

			result += indicators.join(" ");
		}

		return result;
	}

	override getChildren(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		} else {
			const result = [];
			const classes = mentor.vocabulary.getSubClasses(this.document.graphs, this.uri, this.options);

			for (let c of classes) {
				result.push(new ClassNode(this.document, this.id + `/<${c}>`, c, this.options));
			}

			return sortByLabel(result);
		}
	}
}
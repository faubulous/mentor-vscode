import * as vscode from "vscode";
import { RDFS } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { IndividualNode } from "./individual-node";

/**
 * Node of a RDFS or OWL class in the definition tree.
 */
export class ClassNode extends ResourceNode {
	contextType = RDFS.Class;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	/**
	 * Indicates whether class instances should be returned by the {@link getChildren} method.
	 */
	showIndividuals = false;

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

		if (this.uri) {
			const indicators = [];

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
		const classNodes = [];
		const classIris = this.getSubClasses();

		for (const iri of classIris) {
			classNodes.push(this.getClassNode(iri));
		}

		const individualNodes = [];
		const individualUris = this.showIndividuals ? this.getIndividuals() : [];

		for (const iri of individualUris) {
			individualNodes.push(this.getIndividualNode(iri));
		}

		return [
			...sortByLabel(classNodes),
			...sortByLabel(individualNodes)
		];
	}

	getClassNode(iri: string): ClassNode {
		return new ClassNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}

	getIndividualNode(iri: string): ResourceNode {
		return new IndividualNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}
	
	getSubClasses(): string[] {
		return mentor.vocabulary.getSubClasses(this.document.graphs, this.uri, this.options);
	}

	getIndividuals(): string[] {
		return mentor.vocabulary.getSubjectsOfType(this.document.graphs, this.uri!, {
			...this.options,
			includeSubTypes: false
		});
	}
}
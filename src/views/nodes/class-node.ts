import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";
import { IndividualNode } from "./individual-node";

/**
 * Node of a RDFS or OWL class in the definition tree.
 */
export class ClassNode extends DefinitionTreeNode {
	/**
	 * Indicates whether class instances should be returned by the {@link getChildren} method.
	 */
	showIndividuals = false;

	/**
	 * Get the graph IRIs of the document context and possibly extended ontology graphs. This method should be 
	 * used when querying type or sub-class relationships and may be overloaded to provide additional relevant
	 * graphs such as the SHACL spec.
	 * 
	 * Note: Used in {@link getSubClassIris}.
	 * @returns An array of graph IRIs.
	 */
	getOntologyGraphs(): string[] {
		return this.document.graphs;
	}

	getIconNameFromClass(classIri?: string): string {
		let iconName = classIri ? 'rdf-class' : 'rdf-class-ref';

		if (classIri) {
			if (!mentor.vocabulary.hasSubject(this.getDocumentGraphs(), classIri)) {
				iconName += '-ref';
			}

			if (mentor.vocabulary.hasIndividuals(this.getDocumentGraphs(), classIri)) {
				iconName += "-i";
			}
		}

		return iconName;
	}

	getIconColorFromClass(classIri?: string) {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getIcon(): vscode.ThemeIcon | undefined {
		const iconName = this.getIconNameFromClass(this.uri);
		const iconColor = this.getIconColorFromClass(this.uri);

		return new vscode.ThemeIcon(iconName, iconColor);
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getDescription(): string {
		let result = super.getDescription();

		if (this.uri) {
			const indicators = [];

			if (mentor.vocabulary.hasEquivalentClass(this.getOntologyGraphs(), this.uri)) {
				indicators.push("≡");
			}

			// if (mentor.vocabulary.isIntersectionOfClasses(graphs, this.uri)) {
			// 	indicators.push("⋂");
			// } else if (mentor.vocabulary.isUnionOfClasses(graphs, this.uri)) {
			// 	indicators.push("⋃");
			// } else if (mentor.vocabulary.hasEquivalentClass(graphs, this.uri)) {
			// 	indicators.push("≡");
			// }

			result += indicators.join(" ");
		}

		return result;
	}

	override getChildren(): DefinitionTreeNode[] {
		const classNodes = [];
		const classIris = this.getSubClassIris();

		for (const iri of classIris) {
			classNodes.push(this.getClassNode(iri));
		}

		const individualNodes = [];
		const individualUris = this.getIndividualIris();

		for (const iri of individualUris) {
			individualNodes.push(this.getIndividualNode(iri));
		}

		return [
			...sortByLabel(classNodes),
			...sortByLabel(individualNodes)
		];
	}

	getClassNode(iri: string): ClassNode {
		return new ClassNode(this.document, this.id + `/<${iri}>`, iri, this.getQueryOptions());
	}

	getIndividualNode(iri: string): DefinitionTreeNode {
		return new IndividualNode(this.document, this.id + `/<${iri}>`, iri, this.getQueryOptions());
	}

	getSubClassIris(): string[] {
		// Note: We are querying the possibly extended ontology context here for class relationships.
		return mentor.vocabulary.getSubClasses(this.getOntologyGraphs(), this.uri, this.getQueryOptions());
	}

	getIndividualIris(): string[] {
		if (this.showIndividuals) {
			// Note: If we set includeSubTypes to `false`, we need to provide the ontology context so that
			// type hierarchies can be loaded and individuals can be filtered accordingly.
			return mentor.vocabulary.getSubjectsOfType(this.getOntologyGraphs(), this.uri!, this.getQueryOptions({
				includeSubTypes: false
			}));
		} else {
			return [];
		}
	}
}

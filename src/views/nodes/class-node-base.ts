import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { DefinitionTreeNode, sortByLabel } from "../definition-tree-node";

export abstract class ClassNodeBase extends DefinitionTreeNode {
	/**
	 * Indicates whether class instances should be returned by the {@link getChildren} method.
	 */
	showIndividuals(): boolean {
		return true;
	}

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

	/**
	 * Get the icon name of a class depending on its properties in the document graph.
	 * @param classIri IRI of a class.
	 * @returns The icon name of the class.
	 */
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

	/**
	 * Get the icon color of a class depending on its properties in the document graph.
	 * @param classIri IRI of a class.
	 * @returns The icon color of the class.
	 */
	getIconColorFromClass(classIri?: string) {
		return this.getIconColor();
	}

	override getIcon(): vscode.ThemeIcon | undefined {
		const iconName = this.getIconNameFromClass(this.uri);
		const iconColor = this.getIconColorFromClass(this.uri);

		return new vscode.ThemeIcon(iconName, iconColor);
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
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

	/**
	 * Get the node of a class instance. Can be overloaded to provide a custom node type.
	 * @param iri IRI of the node.
	 * @returns A node instance.
	 */
	abstract getClassNode(iri: string): DefinitionTreeNode;

	/**
	 * Get the node of an individual. Can be overloaded to provide a custom node type.
	 * @param iri IRI of the node.
	 * @returns A node instance.
	 */
	abstract getIndividualNode(iri: string): DefinitionTreeNode;

	/**
	 * Get the IRIs of the sub-classes of the class. This method should be overloaded to provide a custom
	 * implementation for specific class types.
	 * @returns An array of sub-class IRIs.
	 */
	getSubClassIris(): string[] {
		// Note: We are querying the possibly extended ontology graphs here for class relationships.
		return mentor.vocabulary.getSubClasses(this.getOntologyGraphs(), this.uri, this.getQueryOptions());
	}

	/**
	 * Get the IRIs of the individuals of the class. This method should be overloaded to provide a custom
	 * implementation for specific class types.
	 * @returns An array of individual IRIs.
	 */
	getIndividualIris(): string[] {
		if (this.showIndividuals()) {
			// Note: If we set includeSubTypes to `false`, we *must* provide the ontology graphs so that
			// type hierarchies can be loaded and individuals can be filtered accordingly. If this is not done,
			// we will return more individuals than expected.
			return mentor.vocabulary.getSubjectsOfType(this.getOntologyGraphs(), this.uri, this.getQueryOptions({
				includeSubTypes: false
			}));
		} else {
			return [];
		}
	}
}
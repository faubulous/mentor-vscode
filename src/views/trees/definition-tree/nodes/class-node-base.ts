import * as vscode from "vscode";
import { mentor } from "@src/mentor";
import { sortByLabel } from "@src/views/trees/tree-node";
import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Base class for all nodes that represent classes in the definition tree, such as classes and properties.
 * It is also used as a base for parent nodes of individual lists such as named individuals, shapes, collections, etc.
 */
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

	override hasChildren(): boolean {
		for (const _ of this.getSubClassIris()) {
			return true;
		}

		if (this.showIndividuals()) {
			for (const _ of this.getIndividualIris()) {
				return true;
			}
		}

		return false;
	}

	override getChildren() {
		const result = [];
		const classNodes = [];

		for (const iri of this.getSubClassIris()) {
			classNodes.push(this.getClassNode(iri));
		}

		result.push(...sortByLabel(classNodes));

		if (this.showIndividuals()) {
			const individualNodes = [];

			for (const iri of this.getIndividualIris()) {
				individualNodes.push(this.getIndividualNode(iri));
			}

			result.push(...sortByLabel(individualNodes));
		}

		return result;
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
	*getSubClassIris(): IterableIterator<string> {
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions();

		// Note: We are querying the possibly extended ontology graphs here for class relationships.
		yield* mentor.vocabulary.getSubClasses(graphs, this.uri, options);
	}

	/**
	 * Get the IRIs of the individuals of the class. This method should be overloaded to provide a custom
	 * implementation for specific class types.
	 * @returns An array of individual IRIs.
	 */
	*getIndividualIris(): IterableIterator<string> {
		const graphs = this.getDocumentGraphs();
		const options = this.getQueryOptions({ includeSubTypes: false });

		// Note: If we set includeSubTypes to `false`, we *must* provide the ontology graphs so that
		// type hierarchies can be loaded and individuals can be filtered accordingly. If this is not done,
		// we will return more individuals than expected.
		yield* mentor.vocabulary.getSubjectsOfType(graphs, this.uri, options);
	}
}
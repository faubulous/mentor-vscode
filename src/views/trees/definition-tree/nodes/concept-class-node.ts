import * as vscode from "vscode";
import { container, VocabularyRepository } from "@src/container";
import { ClassNodeBase } from "./class-node-base";

/**
 * Node of a SKOS concept in the definition tree.
 */
export class ConceptClassNode extends ClassNodeBase {
	private get vocabulary() {
		return container.resolve(VocabularyRepository);
	}

	override getIcon(): vscode.ThemeIcon | undefined {
		return new vscode.ThemeIcon('rdf-concept', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override *getSubClassIris(): IterableIterator<string> {
		yield* this.vocabulary.getNarrowerConcepts(this.getDocumentGraphs(), this.uri);
	}

	override getClassNode(iri: string) {
		return this.createChildNode(ConceptClassNode, iri);
	}

	override getIndividualNode(iri: string) {
		return this.createChildNode(ConceptClassNode, iri);
	}
}

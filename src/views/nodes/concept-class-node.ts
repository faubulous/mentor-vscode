import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { ClassNode } from "./class-node";

/**
 * Node of a SKOS concept in the definition tree.
 */
export class ConceptClassNode extends ClassNode {

	override getIcon() {
		return this.uri ? new vscode.ThemeIcon('rdf-concept', this.getIconColor()) : undefined;
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override getSubClassIris(): string[] {
		const subject = this.getQueryOptions().definedBy ?? this.uri;

		return mentor.vocabulary.getNarrowerConcepts(this.getDocumentGraphs(), subject);
	}

	override getClassNode(iri: string): ClassNode {
		return new ConceptClassNode(this.document, this.id + `/<${iri}>`, iri, this.getQueryOptions());
	}
}

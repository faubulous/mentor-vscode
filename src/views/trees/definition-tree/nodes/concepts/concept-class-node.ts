import * as vscode from "vscode";
import { ClassNodeBase } from "../classes/class-node-base";

/**
 * Node of a SKOS concept in the definition tree.
 */
export class ConceptClassNode extends ClassNodeBase {
	override getIcon(): vscode.ThemeIcon | undefined {
		return new vscode.ThemeIcon('rdf-concept', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.concept");
	}

	override *getSubClassIris(): IterableIterator<string> {
		const graphs = this.getDocumentGraphs();

		// Note: The query options carry the `inScheme` option of the concept scheme this node belongs
		// to, so that narrower concepts of *other* schemes are not displayed below this one.
		const options = this.getQueryOptions();

		yield* this.vocabulary.getNarrowerConcepts(graphs, this.uri, options);
	}

	override getClassNode(iri: string) {
		return this.createChildNode(ConceptClassNode, iri);
	}

	override getIndividualNode(iri: string) {
		return this.createChildNode(ConceptClassNode, iri);
	}
}

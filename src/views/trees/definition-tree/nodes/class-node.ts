import { mentor } from "@src/mentor";
import { ClassNodeBase } from "./class-node-base";
import { IndividualNode } from "./individual-node";

/**
 * Node of a RDFS or OWL class in the definition tree.
 */
export class ClassNode extends ClassNodeBase {
	override showIndividuals(): boolean {
		return false;
	}

	override getContextValue(): string {
		let result = super.getContextValue();

		if (mentor.vocabulary.hasShapes(this.document.graphs, this.uri, this.getQueryOptions({ definedBy: undefined }))) {
			result += " shape-target";
		}

		return result;
	}

	override getDescription(): string {
		let description = super.getDescription();

		if (mentor.vocabulary.hasEquivalentClass(this.getOntologyGraphs(), this.uri)) {
			description += "≡";
		}

		return description;
	}

	getClassNode(iri: string) {
		return this.createChildNode(ClassNode, iri);
	}

	getIndividualNode(iri: string) {
		return this.createChildNode(IndividualNode, iri);
	}
}

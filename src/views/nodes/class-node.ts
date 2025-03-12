import { mentor } from "../../mentor";
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

		return indicators.join(" ");
	}

	getClassNode(iri: string) {
		return this.createChildNode(ClassNode, iri);
	}

	getIndividualNode(iri: string) {
		return this.createChildNode(IndividualNode, iri);
	}
}

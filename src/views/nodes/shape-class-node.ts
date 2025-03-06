import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ClassNode } from "./class-node";
import { NodeShapeNode, PropertyShapeNode, ParameterNode } from "./shape-node";
import { DefinitionTreeNode } from "../definition-tree-node";

export class ShapeClassNode extends ClassNode {
	showIndividuals = true;

	override getOntologyGraphs(): string[] {
		return [_SH, ...this.document.graphs];
	}

	override getSubClassIris(): string[] {
		const options = this.getQueryOptions();
		options.notDefinedBy?.add(_SH);

		const classIris = mentor.vocabulary.getSubClasses(this.getOntologyGraphs(), this.uri ?? SH.Shape);

		return classIris.filter(c => mentor.vocabulary.hasSubjectsOfType(this.getDocumentGraphs(), c, options));
	}

	override getClassNode(iri: string): ClassNode {
		return new ShapeClassNode(this.document, this.id + `/<${iri}>`, iri, this.getQueryOptions());
	}

	override getIndividualNode(iri: string): DefinitionTreeNode {
		if (mentor.vocabulary.hasType(this.getOntologyGraphs(), iri, SH.Parameter, this.getQueryOptions({ includeInferred: true }))) {
			return new ParameterNode(this.document, this.id + `/<${iri}>`, iri, this.getQueryOptions());
		} else if (mentor.vocabulary.hasType(this.getOntologyGraphs(), iri, SH.PropertyShape, this.getQueryOptions({ includeInferred: true }))) {
			return new PropertyShapeNode(this.document, this.id + `/<${iri}>`, iri, this.getQueryOptions());
		} else {
			return new NodeShapeNode(this.document, this.id + `/<${iri}>`, iri, this.getQueryOptions());
		}
	}
}
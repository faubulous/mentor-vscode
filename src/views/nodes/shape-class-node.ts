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
		return this.createChildNode(ShapeClassNode, iri);
	}

	override getIndividualNode(iri: string): DefinitionTreeNode {
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions({ includeInferred: true });

		if (mentor.vocabulary.hasType(graphs, iri, SH.Parameter, options)) {
			return this.createChildNode(ParameterNode, iri);
		} else if (mentor.vocabulary.hasType(graphs, iri, SH.PropertyShape, options)) {
			return this.createChildNode(PropertyShapeNode, iri);
		} else {
			return this.createChildNode(NodeShapeNode, iri);
		}
	}
}
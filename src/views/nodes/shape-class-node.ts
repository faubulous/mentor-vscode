import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ClassNode } from "./class-node";
import { NodeShapeNopde, PropertyShapeNode, ParameterNode } from "./shape-node";
import { DefinitionTreeNode } from "../definition-tree-node";

export class ShapeClassNode extends ClassNode {
	showIndividuals = true;

	override getSubClassIris(): string[] {
		const graphUris = [_SH, ...this.document.graphs];

		const options = { ...this.options };
		options.notDefinedBy?.add(_SH);

		const classIris = mentor.vocabulary.getSubClasses(graphUris, this.uri ?? SH.Shape);

		return classIris.filter(c => mentor.vocabulary.hasSubjectsOfType(graphUris, c, {
			...options,
			includeSubTypes: false
		}));
	}

	override getClassNode(iri: string): ClassNode {
		return new ShapeClassNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}

	override getIndividualNode(iri: string): DefinitionTreeNode {
		if (mentor.vocabulary.hasType(this.document.graphs, iri, SH.Parameter, { includeInferred: true })) {
			return new ParameterNode(this.document, this.id + `/<${iri}>`, iri, this.options);
		} else if (mentor.vocabulary.hasType(this.document.graphs, iri, SH.PropertyShape, { includeInferred: true })) {
			return new PropertyShapeNode(this.document, this.id + `/<${iri}>`, iri, this.options);
		} else {
			return new NodeShapeNopde(this.document, this.id + `/<${iri}>`, iri, this.options);
		}
	}
}
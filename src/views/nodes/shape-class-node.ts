import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ClassNode } from "./class-node";
import { ShapeNode } from "./shape-node";
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
		return new ShapeNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}
}
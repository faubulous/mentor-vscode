import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ClassNode } from "./class-node";
import { ValidatorNode } from "./validator-node";

export class ValidatorClassNode extends ClassNode {
	showIndividuals = true;

	get graphs() {
		return [_SH, ...this.document.graphs];
	}
	
	override getSubClassIris(): string[] {
		const options = { ...this.options };
		options.notDefinedBy?.add(_SH);

		const classIris = mentor.vocabulary.getSubClasses(this.graphs, this.uri ?? SH.Validator);

		return classIris.filter(c => mentor.vocabulary.hasSubjectsOfType(this.graphs, c, options));
	}

	override getClassNode(iri: string): ClassNode {
		return new ValidatorClassNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}

	override getIndividualNode(iri: string): DefinitionTreeNode {
		return new ValidatorNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}
}
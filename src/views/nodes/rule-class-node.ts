import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ClassNode } from "./class-node";
import { DefinitionTreeNode } from "../definition-tree-node";
import { RuleNode } from "./rule-node";

export class RuleClassNode extends ClassNode {
	showIndividuals = true;

	get graphs() {
		return [_SH, ...this.document.graphs];
	}

	override getSubClassIris(): string[] {
		const options = { ...this.options };
		options.notDefinedBy?.add(_SH);

		const classIris = mentor.vocabulary.getSubClasses(this.graphs, this.uri ?? SH.Rule);

		return classIris.filter(c => mentor.vocabulary.hasSubjectsOfType(this.graphs, c, options));
	}

	override getClassNode(iri: string): ClassNode {
		return new RuleClassNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}

	override getIndividualNode(iri: string): DefinitionTreeNode {
		return new RuleNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}
}
import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ClassNode } from "./class-node";
import { DefinitionTreeNode } from "../definition-tree-node";
import { RuleNode } from "./rule-node";

export class RuleClassNode extends ClassNode {
	showIndividuals = true;

	override getOntologyGraphs(): string[] {
		return [_SH, ...this.document.graphs];
	}

	override getSubClassIris(): string[] {
		const options = this.getQueryOptions();
		options.notDefinedBy?.add(_SH);

		const classIris = mentor.vocabulary.getSubClasses(this.getOntologyGraphs(), this.uri ?? SH.Rule);

		return classIris.filter(c => mentor.vocabulary.hasSubjectsOfType(this.getDocumentGraphs(), c, options));
	}

	override getClassNode(iri: string): ClassNode {
		return this.createChildNode(RuleClassNode, iri);
	}

	override getIndividualNode(iri: string): DefinitionTreeNode {
		return this.createChildNode(RuleNode, iri);
	}
}
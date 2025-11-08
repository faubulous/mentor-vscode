import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "@src/mentor";
import { ClassNodeBase } from "./class-node-base";
import { DefinitionTreeNode } from "../definition-tree-node";
import { RuleNode } from "./rule-node";

export class RuleClassNode extends ClassNodeBase {
	override getOntologyGraphs(): string[] {
		return [_SH, ...this.document.graphs];
	}

	override *getSubClassIris(): IterableIterator<string> {
		const options = this.getQueryOptions();
		options.notDefinedBy?.add(_SH);

		const classIris = mentor.vocabulary.getSubClasses(this.getOntologyGraphs(), this.uri ?? SH.Rule);

		for (const c of classIris) {
			if (mentor.vocabulary.hasSubjectsOfType(this.getDocumentGraphs(), c, options)) {
				yield c;
			}
		}
	}

	override getClassNode(iri: string) {
		return this.createChildNode(RuleClassNode, iri);
	}

	override getIndividualNode(iri: string): DefinitionTreeNode {
		return this.createChildNode(RuleNode, iri);
	}
}
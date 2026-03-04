import { _SH, SH } from "@faubulous/mentor-rdf";
import { container, VocabularyRepository } from "@src/container";
import { ClassNodeBase } from "./class-node-base";
import { DefinitionTreeNode } from "../definition-tree-node";
import { RuleNode } from "./rule-node";

export class RuleClassNode extends ClassNodeBase {
	private get vocabulary() {
		return container.resolve(VocabularyRepository);
	}

	override getOntologyGraphs(): string[] {
		return [_SH, ...this.document.graphs];
	}

	override *getSubClassIris(): IterableIterator<string> {
		const options = this.getQueryOptions();
		options.notDefinedBy?.add(_SH);

		const uri = this.uri.startsWith('mentor') ? SH.Rule : this.uri;
		const classIris = this.vocabulary.getSubClasses(this.getOntologyGraphs(), uri);

		for (const c of classIris) {
			if (this.vocabulary.hasSubjectsOfType(this.getDocumentGraphs(), c, options)) {
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
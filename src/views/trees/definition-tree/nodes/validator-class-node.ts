import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "@src/mentor";
import { ClassNodeBase } from "./class-node-base";
import { ValidatorNode } from "./validator-node";

export class ValidatorClassNode extends ClassNodeBase {
	override getOntologyGraphs(): string[] {
		return [_SH, ...this.document.graphs];
	}

	override *getSubClassIris(): IterableIterator<string> {
		const options = this.getQueryOptions();
		options.notDefinedBy?.add(_SH);

		const uri = this.uri.startsWith('mentor') ? SH.Validator : this.uri;
		const classIris = mentor.vocabulary.getSubClasses(this.getOntologyGraphs(), uri);

		for (const c of classIris) {
			if (mentor.vocabulary.hasSubjectsOfType(this.getDocumentGraphs(), c, options)) {
				yield c;
			}
		}
	}

	override getClassNode(iri: string) {
		return this.createChildNode(ValidatorClassNode, iri);
	}

	override getIndividualNode(iri: string) {
		return this.createChildNode(ValidatorNode, iri);
	}
}
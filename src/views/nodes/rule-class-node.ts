import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ClassNode } from "./class-node";
import { ResourceNode } from "./resource-node";
import { RuleNode } from "./rule-node";

export class RuleClassNode extends ClassNode {
	contextType = SH.Rule;

	showIndividuals = true;

	override getSubClasses(): string[] {
		const graphUris = [_SH, ...this.document.graphs];

		const options = { ...this.options };
		options.notDefinedBy?.add(_SH);

		const classIris = mentor.vocabulary.getSubClasses(graphUris, this.uri ?? this.contextType);

		return classIris.filter(c => mentor.vocabulary.hasSubjectsOfType(graphUris, c, {
			...options,
			includeSubTypes: false
		}));
	}

	override getClassNode(iri: string): ClassNode {
		return new RuleClassNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}

	override getIndividualNode(iri: string): ResourceNode {
		return new RuleNode(this.document, this.id + `/<${iri}>`, iri, this.options);
	}
}
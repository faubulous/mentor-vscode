import { _SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { RuleClassNode } from "./rule-class-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RuleGroupNode extends RuleClassNode {
	contextValue = "rules";

	override getLabel() {
		return { label: "Rules" };
	}

	override getDescription(): string {
		const rules = mentor.vocabulary.getRules(this.document.graphs, this.options);

		return rules.length.toString();
	}
}
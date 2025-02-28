import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { RuleClassNode } from "./rule-class-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RuleGroupNode extends RuleClassNode {
	uri = SH.Rule;

	contextValue = "rules";

	override getIcon() {
		return undefined;
	}
	
	override getLabel() {
		return { label: "Rules" };
	}

	override getDescription(): string {
		const rules = mentor.vocabulary.getRules(this.graphs, this.options);

		return rules.length.toString();
	}
}
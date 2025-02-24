import { _SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ValidatorClassNode } from "./validator-class-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class ValidatorGroupNode extends ValidatorClassNode {
	contextValue = "validators";

	override getLabel() {
		return { label: "Validators" };
	}

	override getDescription(): string {
		const validators = mentor.vocabulary.getValidators(this.document.graphs, this.options);

		return validators.length.toString();
	}
}
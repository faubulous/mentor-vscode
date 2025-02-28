import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ValidatorClassNode } from "./validator-class-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class ValidatorGroupNode extends ValidatorClassNode {
	uri = SH.Validator;

	contextValue = "validators";

	override getIcon() {
		return undefined;
	}
	
	override getLabel() {
		return { label: "Validators" };
	}

	override getDescription(): string {
		const validators = mentor.vocabulary.getValidators(this.graphs, this.options);

		return validators.length.toString();
	}
}
import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

/**
 * Node of a SHACL validator in the definition tree.
 */
export class ValidatorNode extends ResourceNode {
	contextType = SH.Validator;

	override getIcon() {
		return new vscode.ThemeIcon('rdf-class', this.getIconColor());
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getResourceUri(): vscode.Uri | undefined {
		return undefined;
	}
}
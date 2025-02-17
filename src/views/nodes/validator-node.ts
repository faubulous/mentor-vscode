import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ResourceNode } from "./resource-node";

/**
 * Node of a SHACL validator in the definition tree.
 */
export class ValidatorNode extends ResourceNode {
	contextType = SH.Validator;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Validators";

	override getIcon() {
		if (this.uri) {
			// Return the ref class icon if the target cannot be found.
			return new vscode.ThemeIcon('rdf-class', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getDescription(): string {
		let result = super.getDescription();

		if (!this.uri) {
			result += " " + mentor.vocabulary.getValidators(this.document.graphs).length.toString();
		}

		return result;
	}

	override getResourceUri(): vscode.Uri | undefined {
		return undefined;
	}

	override getChildren(): DefinitionTreeNode[] {
		if (!this.document) {
			return [];
		}

		const document = this.document;

		const options = { ...this.options };
		options.notDefinedBy?.add(_SH);

		return this.getChildrenOfType([_SH, ...document.graphs], this, SH.Validator, (uri) => new ValidatorNode(document, this.id + `/<${uri}>`, uri, this.options));
	}
}
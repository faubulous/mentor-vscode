import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ShapeNode } from "./shape-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class ValidatorGroupNode extends ResourceNode {
	contextType = SH.Validator;

	contextValue = "validators";

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getLabel() {
		return { label: "Validators" };
	}

	override getDescription(): string {
		const validators = mentor.vocabulary.getValidators(this.document.graphs)

		return validators.length.toString();
	}

	override getChildren(): DefinitionTreeNode[] {
		const document = this.document;

		const options = { ...this.options };
		options.notDefinedBy?.add(_SH);

		return this.getChildrenOfType([_SH, ...document.graphs], this, this.contextType, (uri) => new ShapeNode(document, this.id + `/<${uri}>`, uri, this.options));
	}
}
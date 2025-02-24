import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { DefinitionTreeNode } from "../definition-tree-node";
import { RuleNode } from "./rule-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RuleGroupNode extends ResourceNode {
	contextType = SH.Rule;

	contextValue = "rules";

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getLabel() {
		return { label: "Rules" };
	}

	override getDescription(): string {
		const rules = mentor.vocabulary.getRules(this.document.graphs)

		return rules.length.toString();
	}

	override getChildren(): DefinitionTreeNode[] {
		const document = this.document;

		const options = { ...this.options };
		options.notDefinedBy?.add(_SH);

		return this.getChildrenOfType([_SH, ...document.graphs], this, this.contextType, (uri) => new RuleNode(document, this.id + `/<${uri}>`, uri, this.options));
	}
}
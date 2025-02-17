import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { mentor } from "../../mentor";
import { ResourceNode } from "./resource-node";
import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RuleNode extends ResourceNode {
	contextType = SH.Rule;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	defaultLabel = "Rules";

	override getIcon() {
		if (this.uri) {
			// Return the ref class icon if target cannot be found.
			return new vscode.ThemeIcon('rdf-class', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getDescription(): string {
		let result = super.getDescription();

		if (!this.uri) {
			result += " " + mentor.vocabulary.getRules(this.document.graphs).length.toString();
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

		return this.getChildrenOfType([_SH, ...document.graphs], this, SH.Rule, (uri) => new RuleNode(document, this.id + `/<${uri}>`, uri, this.options));
	}
}
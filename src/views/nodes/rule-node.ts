import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { SH } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

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
		let result = "";

		if (!this.uri) {
			result += " " + mentor.vocabulary.getRules(this.document.graphs).length.toString();
		}

		return result;
	}

	override getResourceUri(): vscode.Uri | undefined {
		return undefined;
	}
}
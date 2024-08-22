import * as vscode from "vscode";
import * as mentor from "../../mentor";
import { SH } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

export class RuleNode extends ResourceNode {
	contextType = SH.Rule;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getIcon() {
		if (this.uri) {
			// Return the ref class icon if target cannot be found.
			return new vscode.ThemeIcon('rdf-class-ref', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Rules"
			}
		} else {
			return {
				label: this.document.getResourceLabel(this.uri)
			}
		}
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
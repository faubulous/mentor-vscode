import * as vscode from "vscode";
import { mentor } from "../../mentor";
import { SH } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

export class ValidatorNode extends ResourceNode {
	contextType = SH.Validator;

	initialCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

	override getIcon() {
		if (this.uri) {
			// Return the ref class icon if target cannot be found.
			return new vscode.ThemeIcon('rdf-class', this.getIconColor());
		}
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.class");
	}

	override getLabel(): vscode.TreeItemLabel {
		if (!this.uri) {
			return {
				label: "Validators"
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
			result += " " + mentor.vocabulary.getValidators(this.document.graphs).length.toString();
		}

		return result;
	}

	override getResourceUri(): vscode.Uri | undefined {
		return undefined;
	}
}
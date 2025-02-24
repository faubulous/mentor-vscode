import * as vscode from "vscode";
import { _SH, SH } from "@faubulous/mentor-rdf";
import { ResourceNode } from "./resource-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RuleNode extends ResourceNode {
	contextType = SH.Rule;

	override getResourceUri(): vscode.Uri | undefined {
		return undefined;
	}
}
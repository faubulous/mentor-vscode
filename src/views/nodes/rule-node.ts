import * as vscode from "vscode";
import { _SH } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Node of a SHACL rule in the definition tree.
 */
export class RuleNode extends DefinitionTreeNode {
	override getResourceUri(): vscode.Uri | undefined {
		return undefined;
	}
}
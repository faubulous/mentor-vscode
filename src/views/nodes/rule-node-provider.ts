import { _SH, SH } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";
import { RuleNode } from "./rule-node";
import { ResourceNodeProvider } from "./resource-node-provider";

/**
 * A provider for SHACL rule nodes.
 */
export class RuleNodeProvider extends ResourceNodeProvider {
	/**
	 * Get the children of a validator node.
	 * @param node A validator node.
	 * @returns An array of validator nodes.
	 */
	getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (this.context != null) {
			const context = this.context;
			const options = { ...node.options };
			options.notDefinedBy?.add(_SH);

			return this.getNodeChildrenOfType([_SH, ...context.graphs], node, SH.Rule, (uri) => new RuleNode(context, node.id + `/<${uri}>`, uri, node.options));
		} else {
			return [];
		}
	}
}
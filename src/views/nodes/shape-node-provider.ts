import { _SH, SH } from "@faubulous/mentor-rdf";
import { DefinitionTreeNode } from "../definition-tree-node";
import { ResourceNodeProvider } from "./resource-node-provider";
import { ShapeNode } from "./shape-node";

/**
 * A provider for SHACL shape nodes.
 */
export class ShapeNodeProvider extends ResourceNodeProvider {
	/**
	 * Get the children of a SHACL shape node.
	 * @param node A shape node.
	 * @returns An array of child nodes.
	 */
	getNodeChildren(node: DefinitionTreeNode): DefinitionTreeNode[] {
		if (!this.context) {
			return [];
		} else {
			const context = this.context;
			const options = { ...node.options };
			options.notDefinedBy?.add(_SH);

			return this.getNodeChildrenOfType([_SH, ...context.graphs], node, SH.Shape, (uri) => new ShapeNode(context, node.id + `/<${uri}>`, uri, node.options));
		}
	}
}
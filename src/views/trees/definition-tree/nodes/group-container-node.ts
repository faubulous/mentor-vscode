import { DefinitionTreeNode } from "../definition-tree-node";

/**
 * Base class for nodes that list group nodes, such as 'Classes' or 'Concepts', and only show
 * the groups that have children.
 */
export abstract class GroupContainerNode extends DefinitionTreeNode {
	/**
	 * The group nodes that may be listed below this node, created once per node so that
	 * {@link hasChildren}, {@link getChildren} and the tree items of the listed group nodes share
	 * the memoized results of {@link DefinitionTreeNode.hasChildrenCached}. Safe to memoize
	 * because the provider recreates all nodes on refresh.
	 */
	private _groupNodes: DefinitionTreeNode[] | undefined;

	/**
	 * Create the group nodes that may be listed below this node, whether they have children or not.
	 * @returns The group nodes in the order they are displayed.
	 */
	protected abstract createGroupNodes(): DefinitionTreeNode[];

	/**
	 * Get the group nodes that may be listed below this node, whether they have children or not.
	 * @returns The group nodes in the order they are displayed.
	 */
	private _getGroupNodes(): DefinitionTreeNode[] {
		return this._groupNodes ??= this.createGroupNodes();
	}

	/**
	 * Indicates whether any group node has children, stopping at the first one that has.
	 * @returns `true` if the node has children, `false` otherwise.
	 */
	override hasChildren(): boolean {
		return this._getGroupNodes().some(node => node.hasChildrenCached());
	}

	/**
	 * Get the group nodes that have children.
	 * @returns The group nodes in the order they are displayed.
	 */
	override getChildren(): DefinitionTreeNode[] {
		return this._getGroupNodes().filter(node => node.hasChildrenCached());
	}

	override resolveNodeForUri(iri: string): DefinitionTreeNode | undefined {
		for (const child of this.getChildren()) {
			const found = child.resolveNodeForUri(iri);

			if (found) {
				return found;
			}
		}

		return undefined;
	}
}

import * as vscode from 'vscode';
import { any } from '@src/utilities';
import { TreeNode, sortByLabel } from "@src/views/trees/tree-node";
import { ClassNodeBase } from "../classes/class-node-base";
import { PropertyNode } from "./property-node";

/**
 * Node of a property in the definition tree.
 */
export class PropertyClassNode extends ClassNodeBase {
	override getResourceUri(): vscode.Uri | undefined {
		return vscode.Uri.parse('mentor:properties:' + this.uri);
	}

	/**
	 * Get the IRIs of the root properties of the property type that are listed below this node.
	 * @returns An iterator of property IRIs.
	 */
	private _getRootPropertyIris(): IterableIterator<string> {
		return this.vocabulary.getRootPropertiesOfType(this.getDocumentGraphs(), this.uri!, this.getQueryOptions());
	}

	/**
	 * Indicates whether the property type has root properties, stopping at the first one. This
	 * replaces the sub-class and instance check of {@link ClassNodeBase.hasChildren} with the
	 * query of {@link getChildren}, so that the node is expandable exactly if it lists properties.
	 * @returns `true` if the node has children, `false` otherwise.
	 */
	override hasChildren(): boolean {
		return any(this._getRootPropertyIris());
	}

	override getChildren(): TreeNode[] {
		const result = [];

		for (const p of this._getRootPropertyIris()) {
			result.push(this.createChildNode(PropertyNode, p));
		}

		return sortByLabel(result);
	}

	override getMemberIris(): string[] {
		return this.collectMemberIris(node => node instanceof PropertyNode);
	}

	override getClassNode(iri: string) {
		return this.createChildNode(PropertyClassNode, iri);
	}

	override getIndividualNode(iri: string) {
		return this.createChildNode(PropertyNode, iri);
	}
}
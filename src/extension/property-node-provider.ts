import * as vscode from 'vscode';
import { DocumentContext } from '../mentor';
import { PropertyRepository } from '@faubulous/mentor-rdf';
import { PropertyNode } from './property-node';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A tree node provider for RDF properties.
 */
export class PropertyNodeProvider extends ResourceNodeProvider<PropertyRepository> {
	
	override getRepository(context: DocumentContext): PropertyRepository | undefined {
		return context?.store ? new PropertyRepository(context.store) : undefined;
	}

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let result = this.repository.getSubProperties(uri).sort().map(u => this.getNode(u));

		if (!this.showReferenced) {
			result = result.filter(u => this.repository?.hasSubject(u));
		}

		return result;
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (!this.repository) {
			throw new Error('Invalid repostory.');
		}

		// const workbench = vscode.workspace.getConfiguration("workbench");

		// const colorCustomizations: any = workbench.get("colorCustomizations");

		// workbench.update(
		// 	"colorCustomizations",
		// 	{
		// 		...colorCustomizations,
		// 		"rdf.ns0": "#006EAE",
		// 	},
		// 	1,
		// );

		return new PropertyNode(this.repository, uri);
	}
}
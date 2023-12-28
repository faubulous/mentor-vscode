import * as vscode from 'vscode';
import { DocumentContext } from '../mentor';
import { ClassRepository } from '@faubulous/mentor-rdf';
import { ClassNode } from './class-node';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A tree node provider for RDF classes.
 */
export class ClassNodeProvider extends ResourceNodeProvider<ClassRepository> {

	/**
	 * Indicates whether classes should be included in the tree that are not explicitly defined in the ontology.
	 */
	public includeReferenced: boolean = true;

	override getRepository(context: DocumentContext): ClassRepository | undefined {
		return context?.store ? new ClassRepository(context.store) : undefined;
	}

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let options = { includeReferencedClasses: this.includeReferenced };
		let result = this.repository.getSubClasses(uri, options).sort().map(u => this.getNode(u));

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

		return new ClassNode(this.repository, uri);
	}
}
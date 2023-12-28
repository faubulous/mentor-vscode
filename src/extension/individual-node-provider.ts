import * as vscode from 'vscode';
import { DocumentContext } from '../mentor';
import { IndividualRepository } from '@faubulous/mentor-rdf';
import { IndividualNode } from './individual-node';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A tree node provider for RDF properties.
 */
export class IndividualNodeProvider extends ResourceNodeProvider<IndividualRepository> {

	override getRepository(context: DocumentContext): IndividualRepository | undefined {
		return context.store ? new IndividualRepository(context.store) : undefined;
	}

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let result = this.repository.getIndividuals().sort().map(u => this.getNode(u));

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

		return new IndividualNode(this.repository, uri);
	}
}
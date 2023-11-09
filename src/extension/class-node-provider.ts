import * as vscode from 'vscode';
import { VocabularyContext } from './mentor';
import { ClassRepository} from '@faubulous/mentor-rdf';
import { ClassNode } from './class-node';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A tree node provider for RDF classes.
 */
export class ClassNodeProvider extends ResourceNodeProvider<ClassRepository> {

	override getRepository(context: VocabularyContext): ClassRepository | undefined {
		return new ClassRepository(context.store);
	}

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let result = this.repository.getSubClasses(uri).sort().map(u => this.getNode(u));

		if (!this.showReferenced) {
			result = result.filter(u => this.repository?.hasSubject(u) || this.repository?.hasSubClasses(u));
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

		return new ClassNode(this.repository, uri);
	}
}
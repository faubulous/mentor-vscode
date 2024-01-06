import * as vscode from 'vscode';
import { DocumentContext } from '../mentor';
import { ClassRepository, IndividualRepository } from '@faubulous/mentor-rdf';
import { IndividualNode } from './individual-node';
import { ResourceNodeProvider } from './resource-node-provider';
import { ClassNode } from './class-node';

/**
 * A tree node provider for RDF properties.
 */
export class IndividualNodeProvider extends ResourceNodeProvider<IndividualRepository> {

	/**
	 * Indicates whether the individual type should be shown as root nodes in the tree.
	 */
	showTypes: boolean = true;

	/**
	 * A class repository that is used for creating individual type nodes.
	 */
	classRepository: ClassRepository | undefined;

	classNodes: any = {};

	override onDidChangeVocabularyContext(context: DocumentContext): void {
		if (context?.store) {
			this.repository = new IndividualRepository(context.store);
			this.classRepository = new ClassRepository(context.store);
		} else {
			this.repository = undefined;
			this.classRepository = undefined;
		}
	}

	override getParent(uri: string): string | undefined {
		return this.repository?.getIndividualTypes(uri).sort().slice(0, 1)[0];
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let result;

		if (!this.showTypes || uri) {
			result = this.repository.getIndividuals(uri).sort();
		} else {
			result = this.repository.getIndividualTypes().sort();

			// Mark the nodes as classes for the getTreeItem method.
			result.forEach((type: string) => this.classNodes[type] = true);
		}

		return result;
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (this.classNodes[uri]) {
			return new ClassNode(this.classRepository!, uri, vscode.TreeItemCollapsibleState.Collapsed);
		} else {
			return new IndividualNode(this.repository!, uri);
		}
	}

	override getTotalItemCount(): number {
		return this.repository ? this.repository.getIndividuals().length : 0;
	}
}
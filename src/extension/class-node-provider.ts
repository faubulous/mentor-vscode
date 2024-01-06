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
	public showReferenced: boolean = true;

	override onDidChangeVocabularyContext(context: DocumentContext): void {
		if (context?.store) {
			this.repository = new ClassRepository(context.store);
		} else {
			this.repository = undefined;
		}
	}

	override getParent(uri: string): string | undefined {
		if (!this.repository) {
			return undefined;
		}

		let result = this.repository.getSuperClasses(uri).sort().slice(0, 1);

		return result.length > 0 ? result[0] : undefined;
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let options = { includeReferencedClasses: this.showReferenced };
		let result = this.repository.getSubClasses(uri, options).sort();

		return result;
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (!this.repository) {
			throw new Error('Invalid repostory.');
		}

		return new ClassNode(this.repository, uri);
	}

	override getTotalItemCount(): number {
		return this.repository ? this.repository.getClasses({ includeReferencedClasses: false }).length : 0;
	}
}
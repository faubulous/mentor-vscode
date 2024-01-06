import * as vscode from 'vscode';
import { DocumentContext } from '../mentor';
import { PropertyRepository } from '@faubulous/mentor-rdf';
import { PropertyNode } from './property-node';
import { ResourceNodeProvider } from './resource-node-provider';

/**
 * A tree node provider for RDF properties.
 */
export class PropertyNodeProvider extends ResourceNodeProvider<PropertyRepository> {

	override onDidChangeVocabularyContext(context: DocumentContext): void {
		if (context?.store) {
			this.repository = new PropertyRepository(context.store);
		} else {
			this.repository = undefined;
		}
	}

	override getParent(uri: string): string | undefined {
		return undefined;
	}

	override getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		let result = this.repository.getSubProperties(uri).sort();

		return result;
	}

	override getTreeItem(uri: string): vscode.TreeItem {
		if (!this.repository) {
			throw new Error('Invalid repostory.');
		}

		return new PropertyNode(this.repository, uri);
	}

	override getTotalItemCount(): number {
		return this.repository ? this.repository.getProperties().length : 0;
	}
}
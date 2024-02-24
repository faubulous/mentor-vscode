import * as vscode from 'vscode';
import { DocumentContext } from '../languages/document-context';
import { ResourceNode } from './resource-node';

/**
 * Represents an individual in the ontology tree view.
 */
export class IndividualNode extends ResourceNode {
	contextValue = 'individual';

	type: 'individual' | 'class' = 'individual';

	constructor(
		protected readonly context: DocumentContext,
		public readonly uri: string
	) {
		super(context, uri);
	}

	override getIconColor() {
		return new vscode.ThemeColor("mentor.color.individual");
	}

	override getIcon(): vscode.ThemeIcon {
		return new vscode.ThemeIcon('rdf-individual', this.getIconColor());
	}
}
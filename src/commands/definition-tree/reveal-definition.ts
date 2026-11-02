import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { ResourceDefinitionProvider } from '@src/providers';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import type { FormEditorProvider } from '@src/views/webviews/views/form-editor';

const contextService = () => container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);

export const revealDefinition = {
	id: 'mentor.command.revealDefinition',
	handler: async (arg: DefinitionTreeNode | string, restoreFocus: boolean = false) => {
		const uri = getIriFromArgument(arg);

		if (!uri) {
			// If no id is provided, we fail gracefully.
			return;
		}

		const context = contextService();

		// A form editor in front shows the definition, or narrows to what a type or section lists,
		// instead of a text editor being opened for it.
		if (_showInFormEditor(context, arg, uri)) {
			return;
		}

		const editor = await context.activateDocument();

		if (context.activeContext && editor && uri) {
			const location = new ResourceDefinitionProvider(contextService()).provideDefinitionForResource(context.activeContext, uri, true);

			if (location instanceof vscode.Location) {
				editor.selection = new vscode.Selection(location.range.start, location.range.end);
				
				editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);

				if (restoreFocus) {
					// Reset the focus to the definition tree.
					vscode.commands.executeCommand('mentor.view.definitionTree.focus');
				}
			}
		}
	}
};

/**
 * Show a definition tree node in the form editor in front, when the document of the tree is open
 * in one: a type or section node narrows the editor to the resources it lists, any other node
 * reveals the card of its resource. The tree keeps the focus, as no editor is activated.
 * @param context The document context service.
 * @param arg The node, or its identifier.
 * @param iri The IRI of the node.
 * @returns Whether the node was shown in a form editor.
 */
function _showInFormEditor(context: IDocumentContextService, arg: DefinitionTreeNode | string, iri: string): boolean {
	const documentUri = context.activeContext?.uri;
	const formEditor = _formEditorProvider();

	if (!documentUri || !formEditor?.isActive(documentUri)) {
		return false;
	}

	const members = arg instanceof DefinitionTreeNode ? arg.getMemberIris() : undefined;

	if (members && arg instanceof DefinitionTreeNode) {
		formEditor.filterResources(documentUri, _labelOf(arg), members.map(_termOf));

		return true;
	}

	formEditor.revealResource(documentUri, _termOf(iri));

	return true;
}

/**
 * The form editor provider, when the extension registered one.
 * @returns The provider, or `undefined` when the form editor is not enabled.
 */
function _formEditorProvider(): FormEditorProvider | undefined {
	return container.isRegistered(ServiceToken.FormEditorProvider)
		? container.resolve<FormEditorProvider>(ServiceToken.FormEditorProvider)
		: undefined;
}

/**
 * The label a node shows in the tree.
 * @param node The node.
 * @returns The label text.
 */
function _labelOf(node: DefinitionTreeNode): string {
	const label = node.getLabel();

	return typeof label === 'string' ? label : label.label;
}

/**
 * Get the term of a resource of the tree, which names it by an IRI or by the identifier of a
 * blank node. The store names blank nodes as the parser does, so the form knows them by the same
 * identifiers. An absolute IRI has a scheme, followed by a colon, which a blank node identifier
 * never holds.
 * @param value The IRI or the blank node identifier.
 * @returns The term.
 */
function _termOf(value: string): NamedNode | BlankNode {
	return value.includes(':') ? RdfDataFactory.namedNode(value) : RdfDataFactory.blankNode(value);
}

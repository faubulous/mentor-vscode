import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { ResourceDefinitionProvider } from '@src/providers';
import { IDefinitionRevealTarget } from './definition-reveal-target.interface';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';

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

		// An editor in front that shows definitions itself, such as the form editor, shows the
		// definition, or narrows to what a type or section lists, instead of a text editor.
		if (_showInRevealTarget(context, arg, uri)) {
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
 * Show a definition tree node in an editor in front that shows definitions itself, such as the
 * form editor: a type or section node narrows it to the resources the node lists, any other node
 * reveals its resource. The editor decides from the resources it holds, so a resource it does not
 * describe falls through to the text editor. The tree keeps the focus, as no editor is activated.
 * @param context The document context service.
 * @param arg The node, or its identifier.
 * @param resource The IRI or blank node identifier of the node.
 * @returns Whether an editor showed the node.
 */
function _showInRevealTarget(context: IDocumentContextService, arg: DefinitionTreeNode | string, resource: string): boolean {
	const documentUri = context.activeContext?.uri;
	const target = container.isRegistered(ServiceToken.DefinitionRevealTarget)
		? container.resolve<IDefinitionRevealTarget>(ServiceToken.DefinitionRevealTarget)
		: undefined;

	if (!documentUri || !target) {
		return false;
	}

	const members = arg instanceof DefinitionTreeNode ? arg.getMemberIris() : undefined;

	return members && arg instanceof DefinitionTreeNode
		? target.filterDefinitions(documentUri, _labelOf(arg), members)
		: target.revealDefinition(documentUri, resource);
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

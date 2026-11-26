import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService, IPresetDocumentService } from '@src/services/document';
import { IWorkspaceIndexerService } from '@src/services/core/workspace-indexer.interface';
import { ResourceDefinitionProvider } from '@src/providers';
import { IDefinitionRevealTarget, RevealDefinitionOptions } from './reveal-definition.interface';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';

const contextService = () => container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);

export const revealDefinition = {
	id: 'mentor.command.revealDefinition',
	/**
	 * Reveal the definition of a resource: in an editor in front that shows the definitions itself,
	 * such as the form editor; else in the active document; with the workspace scope, where the
	 * active document does not define the resource, in the file of the workspace or the vocabulary
	 * that defines it, as "Go to Definition" of the text editor does.
	 * @param arg The node of the definition tree, or the IRI or blank node identifier of the resource.
	 * @param options Where the definition is looked for, and whether the tree gets the focus back.
	 */
	handler: async (arg: DefinitionTreeNode | string, options: RevealDefinitionOptions = {}) => {
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

		const location = options.scope === 'workspace' ? await _findDefinitionInWorkspace(context, uri) : undefined;
		const revealed = location && location.uri.toString() !== context.activeContext?.uri.toString()
			? await _revealInDocument(location)
			: await _revealInActiveDocument(context, uri);

		if (revealed && options.restoreFocus) {
			// Reset the focus to the definition tree.
			vscode.commands.executeCommand('mentor.view.definitionTree.focus');
		}
	}
};

/**
 * Find the definition of a resource as "Go to Definition" of the text editor finds it: in the
 * active document, else in the workspace or the vocabularies Mentor ships with, once the workspace
 * is indexed, else where the active document mentions the resource.
 * @param context The document context service.
 * @param resource The IRI or blank node identifier of the resource.
 * @returns The location, or `undefined` where nothing defines or mentions the resource.
 */
async function _findDefinitionInWorkspace(context: IDocumentContextService, resource: string): Promise<vscode.Location | undefined> {
	// A link in the hover of a file that is no RDF document has no active document to start from.
	const primary = context.activeContext ?? Object.values(context.contexts ?? {}).find(candidate => candidate.isLoaded);

	if (!primary) {
		return undefined;
	}

	const provider = new ResourceDefinitionProvider(
		context,
		_resolveIfRegistered<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService),
		_resolveIfRegistered<IPresetDocumentService>(ServiceToken.PresetDocumentService)
	);
	const definition = await provider.provideDefinitionOfResource(primary, resource);
	const location = Array.isArray(definition) ? definition[0] : definition;

	return location instanceof vscode.Location ? location : undefined;
}

/**
 * Open the document of a definition and select it.
 * @param location The definition.
 * @returns Whether it was revealed.
 */
async function _revealInDocument(location: vscode.Location): Promise<boolean> {
	await vscode.window.showTextDocument(location.uri, { selection: location.range });

	return true;
}

/**
 * Select the definition of a resource in the active document, else where the document mentions it.
 * @param context The document context service.
 * @param resource The IRI or blank node identifier of the resource.
 * @returns Whether it was revealed.
 */
async function _revealInActiveDocument(context: IDocumentContextService, resource: string): Promise<boolean> {
	const editor = await context.activateDocument();

	if (!context.activeContext || !editor) {
		return false;
	}

	const location = new ResourceDefinitionProvider(context).provideDefinitionForResource(context.activeContext, resource, true);

	if (!(location instanceof vscode.Location)) {
		return false;
	}

	editor.selection = new vscode.Selection(location.range.start, location.range.end);
	editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);

	return true;
}

/**
 * Resolve a service of the container where it is registered.
 * @param token The token of the service.
 * @returns The service, or `undefined` where it is not registered.
 */
function _resolveIfRegistered<T>(token: ServiceToken): T | undefined {
	return container.isRegistered(token) ? container.resolve<T>(token) : undefined;
}

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

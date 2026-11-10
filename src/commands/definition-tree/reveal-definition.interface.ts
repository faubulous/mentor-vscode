import * as vscode from 'vscode';

/**
 * An editor that shows the definitions of the definition tree itself, in place of a text editor,
 * while it is in front with the document of the tree. The reveal command of the tree asks it
 * first and opens a text editor only when it declines.
 */
export interface IDefinitionRevealTarget {
	/**
	 * Show the definition of a resource, when an editor of the document is in front and describes
	 * the resource.
	 * @param documentUri The document of the definition tree.
	 * @param resource The IRI the tree names the resource by, or the identifier of a blank node.
	 * @returns Whether the definition was shown.
	 */
	revealDefinition(documentUri: vscode.Uri, resource: string): boolean;

	/**
	 * Narrow an editor of the document in front to the resources a node of the tree lists, such as
	 * the classes of the document or the individuals of a class.
	 * @param documentUri The document of the definition tree.
	 * @param label The label of the node.
	 * @param resources The IRIs or blank node identifiers of the resources it lists.
	 * @returns Whether an editor was narrowed.
	 */
	filterDefinitions(documentUri: vscode.Uri, label: string, resources: readonly string[]): boolean;
}

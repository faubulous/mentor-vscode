import * as vscode from 'vscode';
import { DocumentContext } from "@/document-context";

/**
 * A provider that retrieves the locations of resource definitions in a document.
 */
export interface DefinitionProvider {
	/**
	 * Get the definition of a resource at a specific position in a document.
	 * @param document The document in which the resource is defined.
	 * @param position The position of the resource.
	 * @returns The definition of the resource at the specified position.
	 */
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition>;

	/**
	 * Get the definition of a resource with a specific IRI.
	 * @param primaryContext The primary document context.
	 * @param uri The URI of the resource.
	 * @param primaryContextOnly Indicates whether only the primary document context should be used.
	 * @returns The definition of the resource with the specified URI or `null` if no definition was found.
	 */
	provideDefinitionForIri(primaryContext: DocumentContext, uri: string, primaryContextOnly?: boolean): vscode.Definition | null;
}
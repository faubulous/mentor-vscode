import * as vscode from 'vscode';

/**
 * A provider that retrieves the locations of resource references in a document.
 */
export interface ReferenceProvider extends vscode.ReferenceProvider {
	/**
	 * Get the locations of references for a given resource.
	 * @param iri The IRI of the resource.
	 * @returns The locations of the references.
	 */
	provideReferencesForIri(iri: string): vscode.Location[];
}
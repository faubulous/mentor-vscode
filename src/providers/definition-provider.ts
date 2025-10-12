import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { DocumentContext } from '@src/workspace/document-context';

/**
 * A provider that retrieves the locations of resource definitions in a document.
 */
export class DefinitionProvider {
	/**
	 * Get the definition of a resource at a specific position in a document.
	 * @param document The document in which the resource is defined.
	 * @param position The position of the resource.
	 * @returns The definition of the resource at the specified position.
	 */
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const context = mentor.contexts[document.uri.toString()];

		if (!context) {
			return null;
		}

		const iri = context.getIriAtPosition(position);

		if (iri) {
			return this.provideDefinitionForIri(context, iri);
		} else {
			return null;
		}
	}

	/**
	 * Get the definition of a resource with a specific IRI.
	 * @param primaryContext The primary document context.
	 * @param uri The URI of the resource.
	 * @param primaryContextOnly Indicates whether only the primary document context should be used.
	 * @returns The definition of the resource with the specified URI or `null` if no definition was found.
	 */
	provideDefinitionForIri(primaryContext: DocumentContext, iri: string, primaryContextOnly: boolean = false): vscode.Definition | null {
		let range;
		let context = primaryContext;

		if (!primaryContextOnly) {
			// Find all contexts that define the URI.
			const contexts = this._getContextsDefiningIri(iri, primaryContext);

			for (let c of contexts.filter(c => c.typeDefinitions[iri])) {
				// Look for type assertions first, because sometimes namespaces are defined as rdf:type owl:Ontology.
				range = c.typeDefinitions[iri][0];
				context = c;

				break;
			}
		}

		// If no class or property definition was found, look for namespace definitions or references in the primary document.
		if (!range) {
			if (primaryContext.typeDefinitions[iri]) {
				range = primaryContext.typeDefinitions[iri][0];
			} else if (primaryContext.typeAssertions[iri]) {
				range = primaryContext.typeAssertions[iri][0];
			} else if (primaryContext.namespaceDefinitions[iri]) {
				range = primaryContext.namespaceDefinitions[iri][0];
			} else if (primaryContext.references[iri]) {
				range = primaryContext.references[iri][0];
			}
		}

		if (range) {
			return new vscode.Location(context.uri, new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character));
		}

		return null;
	}

	private _getContextsDefiningIri(iri: string, primaryContext?: DocumentContext): DocumentContext[] {
		const result: DocumentContext[] = [];
		const contexts = Object.values(mentor.contexts);

		for (const c of contexts.filter(c => c.typeDefinitions[iri])) {
			if (primaryContext && c == primaryContext) {
				result.unshift(c);
			} else {
				result.push(c);
			}
		}

		return result;
	}
}
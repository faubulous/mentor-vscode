import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { IDocumentContext } from '@src/services/document/document-context.interface';

/**
 * A provider that retrieves the locations of resource definitions in a document.
 */
export class ResourceDefinitionProvider {
	private get _contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	/**
	 * Get the definition of a resource at a specific position in a document.
	 * @param document The document in which the resource is defined.
	 * @param position The position of the resource.
	 * @returns The definition of the resource at the specified position.
	 */
	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const context = this._contextService.contexts[document.uri.toString()];

		if (!context) {
			return null;
		}

		const iri = context.getIriAtPosition(position);

		if (iri) {
			return this.provideDefinitionForResource(context, iri);
		} else {
			return null;
		}
	}

	/**
	 * Get the definition of a resource with a specific IRI or blank node ID.
	 * @param primaryContext The primary document context.
	 * @param id The IRI or blank node ID of the resource.
	 * @param primaryContextOnly Indicates whether only the primary document context should be used.
	 * @returns The definition of the resource with the specified IRI or blank node ID, or `null` if no definition was found.
	 */
	provideDefinitionForResource(primaryContext: IDocumentContext, id: string, primaryContextOnly: boolean = false): vscode.Definition | null {
		let range;
		let context = primaryContext;

		if (!primaryContextOnly) {
			// Find all contexts that define the IRI or blank node ID.
			const contexts = this._getContextsDefiningResource(id, primaryContext);

			for (let c of contexts.filter(c => c.typeDefinitions[id])) {
				// Look for type assertions first, because sometimes namespaces are defined as rdf:type owl:Ontology.
				range = c.typeDefinitions[id][0];
				context = c;

				break;
			}
		}

		// If no class or property definition was found, look for namespace definitions or references in the primary document.
		if (!range) {
			if (primaryContext.typeDefinitions[id]) {
				range = primaryContext.typeDefinitions[id][0];
			} else if (primaryContext.typeAssertions[id]) {
				range = primaryContext.typeAssertions[id][0];
			} else if (primaryContext.namespaceDefinitions[id]) {
				range = primaryContext.namespaceDefinitions[id][0];
			} else if (primaryContext.references[id]) {
				range = primaryContext.references[id][0];
			}
		}

		if (range) {
			return new vscode.Location(context.uri, new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character));
		}

		return null;
	}

	private _getContextsDefiningResource(iriOrBlankId: string, primaryContext?: IDocumentContext): IDocumentContext[] {
		const result: IDocumentContext[] = [];
		const contexts = Object.values(this._contextService.contexts);

		for (const c of contexts.filter(c => c.typeDefinitions[iriOrBlankId])) {
			if (primaryContext && c == primaryContext) {
				result.unshift(c);
			} else {
				result.push(c);
			}
		}

		return result;
	}
}
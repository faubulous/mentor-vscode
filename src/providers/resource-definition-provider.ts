import * as vscode from 'vscode';
import { IDocumentContextService } from '@src/services/document';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { IWorkspaceIndexerService } from '@src/services/core/workspace-indexer.interface';

/**
 * A provider that retrieves the locations of resource definitions in a document.
 */
export class ResourceDefinitionProvider {
	/**
	 * @param _contextService The service that holds the loaded document contexts.
	 * @param _indexer The workspace indexer. When given, a definition that is not loaded
	 * yet is looked up once the workspace is indexed.
	 */
	constructor(
		private readonly _contextService: IDocumentContextService,
		private readonly _indexer?: Pick<IWorkspaceIndexerService, 'indexingFinished' | 'waitForIndexed'>
	) { }

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

		if (!iri) {
			return null;
		}

		// While the workspace is being indexed, the file that defines the resource may
		// not be loaded yet. Answer from the complete index instead of falling back to
		// a reference in this document.
		if (this._indexer && !this._indexer.indexingFinished && !this._isDefinedInLoadedContext(iri)) {
			const uri = document.uri.toString();

			return this._indexer.waitForIndexed().then(() => {
				return this.provideDefinitionForResource(this._contextService.contexts[uri] ?? context, iri);
			});
		}

		return this.provideDefinitionForResource(context, iri);
	}

	/**
	 * Indicates whether a loaded document context defines a resource.
	 * @param id The IRI or blank node ID of the resource.
	 */
	private _isDefinedInLoadedContext(id: string): boolean {
		return Object.values(this._contextService.contexts).some(c => c.typeDefinitions.has(id));
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

			for (let c of contexts.filter(c => c.typeDefinitions.has(id))) {
				// Look for type assertions first, because sometimes namespaces are defined as rdf:type owl:Ontology.
				range = c.typeDefinitions.first(id);
				context = c;

				break;
			}
		}

		// If no class or property definition was found, look for namespace definitions or references in the primary document.
		if (!range) {
			range = primaryContext.typeDefinitions.first(id)
				?? primaryContext.typeAssertions.first(id)
				?? primaryContext.namespaceDefinitions.first(id)
				?? primaryContext.references.first(id);
		}

		if (range) {
			return new vscode.Location(context.uri, new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character));
		}

		return null;
	}

	private _getContextsDefiningResource(iriOrBlankId: string, primaryContext?: IDocumentContext): IDocumentContext[] {
		const result: IDocumentContext[] = [];
		const contexts = Object.values(this._contextService.contexts);

		for (const c of contexts.filter(c => c.typeDefinitions.has(iriOrBlankId))) {
			if (primaryContext && c == primaryContext) {
				result.unshift(c);
			} else {
				result.push(c);
			}
		}

		return result;
	}
}
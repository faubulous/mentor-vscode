import * as vscode from 'vscode';
import { IDocumentContextService, IPresetDocumentService } from '@src/services/document';
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
	 * @param _presetDocuments The service that loads the documents of the preset graphs. When
	 * given, a resource that is not defined in the workspace is looked up in the framework
	 * vocabularies and the preset shape graphs.
	 */
	constructor(
		private readonly _contextService: IDocumentContextService,
		private readonly _indexer?: Pick<IWorkspaceIndexerService, 'indexingFinished' | 'waitForIndexed'>,
		private readonly _presetDocuments?: IPresetDocumentService
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
				return this._provideDefinitionIncludingPresets(this._contextService.contexts[uri] ?? context, iri);
			});
		}

		return this._provideDefinitionIncludingPresets(context, iri);
	}

	/**
	 * Get the definition of a resource. A resource that is not defined in a loaded context
	 * is looked up in the preset graphs, whose documents are loaded on demand.
	 * @param primaryContext The primary document context.
	 * @param id The IRI or blank node ID of the resource.
	 * @returns The definition of the resource, or `null` if no definition was found.
	 */
	private _provideDefinitionIncludingPresets(primaryContext: IDocumentContext, id: string): vscode.ProviderResult<vscode.Definition> {
		if (this._presetDocuments && !this._isDefinedInLoadedContext(id)) {
			return this._presetDocuments.ensureLoaded().then(() => {
				return this.provideDefinitionForResource(primaryContext, id);
			});
		}

		return this.provideDefinitionForResource(primaryContext, id);
	}

	/**
	 * Indicates whether a loaded document context defines a resource.
	 * @param id The IRI or blank node ID of the resource.
	 */
	private _isDefinedInLoadedContext(id: string): boolean {
		return Object.values(this._contextService.contexts).some(c => this._definesResource(c, id));
	}

	/**
	 * Indicates whether a document context defines a resource. In the documents of the preset
	 * graphs, which only describe the resources they define, any subject counts as a definition:
	 * the SPARQL syntax vocabulary types its built-in functions with a class of its own, and the
	 * SKOS vocabulary asserts the types after the other properties of a subject.
	 * @param context A document context.
	 * @param id The IRI or blank node ID of the resource.
	 */
	private _definesResource(context: IDocumentContext, id: string): boolean {
		return context.typeDefinitions.has(id) || (context.isPreset && context.subjects.has(id));
	}

	/**
	 * Get the range of the definition of a resource in a context that defines it.
	 * @param context A document context that defines the resource.
	 * @param id The IRI or blank node ID of the resource.
	 */
	private _getDefinitionRange(context: IDocumentContext, id: string) {
		return context.typeDefinitions.first(id) ?? (context.isPreset ? context.subjects.first(id) : undefined);
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
			// Use the first context that defines the IRI or blank node ID. Look for type
			// assertions first, because sometimes namespaces are defined as rdf:type owl:Ontology.
			const definingContext = this._getContextsDefiningResource(id, primaryContext)[0];

			if (definingContext) {
				range = this._getDefinitionRange(definingContext, id);
				context = definingContext;
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

	/**
	 * Get the contexts that define a resource, ordered by precedence: the primary context,
	 * the workspace documents and finally the documents of the preset graphs, so that a
	 * definition in the workspace takes precedence over one in a framework vocabulary.
	 * @param id The IRI or blank node ID of the resource.
	 * @param primaryContext The primary document context.
	 * @returns The contexts that define the resource.
	 */
	private _getContextsDefiningResource(id: string, primaryContext?: IDocumentContext): IDocumentContext[] {
		const result: IDocumentContext[] = [];
		const presetContexts: IDocumentContext[] = [];
		const contexts = Object.values(this._contextService.contexts);

		for (const c of contexts.filter(c => this._definesResource(c, id))) {
			if (primaryContext && c == primaryContext) {
				result.unshift(c);
			} else if (c.isPreset) {
				presetContexts.push(c);
			} else {
				result.push(c);
			}
		}

		return [...result, ...presetContexts];
	}
}

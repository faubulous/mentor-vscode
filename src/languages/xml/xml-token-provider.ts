import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { VocabularyRepository } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { IWorkspaceIndexerService } from '@src/services/core';
import { ResourceReferenceProvider, NotebookCellSlugCodeLensProvider } from '@src/providers';
import { TurtleUsageCodeLensProvider } from '@src/languages/turtle/providers';
import { XmlRenameProvider } from '@src/languages/xml/providers';

/**
 * Registers the language feature providers for the RDF/XML language.
 *
 * This is a composition point: services are resolved from the container once
 * and passed into the provider constructors.
 */
export class XmlTokenProvider {
	private readonly _codelensProvider: TurtleUsageCodeLensProvider;
	private readonly _notebookSlugCodelensProvider: NotebookCellSlugCodeLensProvider;
	private readonly _referenceProvider: ResourceReferenceProvider;
	private readonly _renameProvider: XmlRenameProvider;

	constructor() {
		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const vocabulary = container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
		const workspaceIndexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);

		this._codelensProvider = new TurtleUsageCodeLensProvider(contextService, workspaceIndexer, vocabulary);
		this._notebookSlugCodelensProvider = new NotebookCellSlugCodeLensProvider(contextService);
		this._referenceProvider = new ResourceReferenceProvider(contextService);
		this._renameProvider = new XmlRenameProvider(contextService);

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(...this.registerForLanguage('xml'));
	}

	protected registerForLanguage(language: string): vscode.Disposable[] {
		return [
			vscode.languages.registerCodeLensProvider({ language }, this._codelensProvider),
			vscode.languages.registerReferenceProvider({ language }, this._referenceProvider),
			vscode.languages.registerRenameProvider({ language }, this._renameProvider),
			vscode.languages.registerCodeLensProvider({ language }, this._notebookSlugCodelensProvider),
		];
	}
}
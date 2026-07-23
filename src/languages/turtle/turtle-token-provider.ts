import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { VocabularyRepository } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { IPrefixLookupService } from '@src/services/document';
import { IWorkspaceIndexerService } from '@src/services/core';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { ISparqlConnectionRegistry, IDocumentConnectionService } from '@src/languages/sparql/services';
import {
	ResourceReferenceProvider,
	ResourceDefinitionProvider,
	WorkspaceGraphDefinitionProvider,
	NotebookCellSlugCodeLensProvider
} from '@src/providers';
import {
	TurtleAutoDefinePrefixProvider,
	TurtleCodeActionsProvider,
	TurtleUsageCodeLensProvider,
	TurtleCompletionItemProvider,
	TurtlePrefixCompletionProvider,
	TurtleRenameProvider,
	TurtleCodeFormattingProvider,
	TurtleValidationCodeLensProvider,
	TurtleConnectionCodeLensProvider
} from '@src/languages/turtle/providers';
import {
	TurtlePrefixDefinitionService
} from '@src/languages/turtle/services/turtle-prefix-definition-service';

/**
 * Registers the language feature providers for the Turtle language family.
 *
 * This is a composition point: services are resolved from the container once
 * and passed into the provider constructors.
 */
export class TurtleTokenProvider {
	private readonly _codeActionsProvider: TurtleCodeActionsProvider;
	private readonly _codelensProvider: TurtleUsageCodeLensProvider;
	private readonly _completionProvider: TurtleCompletionItemProvider;
	private readonly _definitionProvider: ResourceDefinitionProvider;
	private readonly _notebookSlugCodelensProvider: NotebookCellSlugCodeLensProvider;
	private readonly _workspaceGraphDefinitionProvider: WorkspaceGraphDefinitionProvider;
	private readonly _prefixCompletionProvider: TurtlePrefixCompletionProvider;
	private readonly _referenceProvider: ResourceReferenceProvider;
	private readonly _renameProvider: TurtleRenameProvider;
	private readonly _formattingProvider: TurtleCodeFormattingProvider;
	private readonly _validationCodelensProvider: TurtleValidationCodeLensProvider;
	private readonly _connectionCodelensProvider: TurtleConnectionCodeLensProvider;

	constructor() {
		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const vocabulary = container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
		const prefixLookup = container.resolve<IPrefixLookupService>(ServiceToken.PrefixLookupService);
		const workspaceIndexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
		const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);

		this._codeActionsProvider = new TurtleCodeActionsProvider(contextService);
		this._codelensProvider = new TurtleUsageCodeLensProvider(contextService, workspaceIndexer, vocabulary);
		this._completionProvider = new TurtleCompletionItemProvider(contextService, vocabulary);
		this._definitionProvider = new ResourceDefinitionProvider(contextService);
		this._notebookSlugCodelensProvider = new NotebookCellSlugCodeLensProvider(contextService);
		this._workspaceGraphDefinitionProvider = new WorkspaceGraphDefinitionProvider(contextService);
		this._prefixCompletionProvider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}> .`, contextService, prefixLookup);
		this._referenceProvider = new ResourceReferenceProvider(contextService);
		this._renameProvider = new TurtleRenameProvider(contextService);
		this._formattingProvider = new TurtleCodeFormattingProvider();
		this._validationCodelensProvider = new TurtleValidationCodeLensProvider(contextService, workspaceIndexer, validationService);
		this._connectionCodelensProvider = new TurtleConnectionCodeLensProvider(connectionRegistry, documentConnectionService);

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);

		const prefixDefinitionService = container.resolve<TurtlePrefixDefinitionService>(ServiceToken.TurtlePrefixDefinitionService);
		const autoDefinePrefixProvider = new TurtleAutoDefinePrefixProvider(this.getLanguages(), prefixDefinitionService, contextService);
		context.subscriptions.push(autoDefinePrefixProvider);

		for (const language of this.getLanguages()) {
			context.subscriptions.push(...this.registerForLanguage(language));
		}
	}

	/**
	 * Returns the languages this provider should register for.
	 * Override in subclasses to register for different languages.
	 */
	protected getLanguages(): string[] {
		return ['ntriples', 'nquads', 'turtle', 'n3'];
	}

	protected registerForLanguage(language: string): vscode.Disposable[] {
		return [
			vscode.languages.registerCodeActionsProvider({ language }, this._codeActionsProvider),
			vscode.languages.registerCodeLensProvider({ language }, this._codelensProvider),
			vscode.languages.registerCompletionItemProvider({ language }, this._completionProvider, ':'),
			vscode.languages.registerDefinitionProvider({ language }, this._definitionProvider),
			vscode.languages.registerDefinitionProvider({ language }, this._workspaceGraphDefinitionProvider),
			vscode.languages.registerDocumentFormattingEditProvider({ language }, this._formattingProvider),
			vscode.languages.registerInlineCompletionItemProvider({ language }, this._prefixCompletionProvider),
			vscode.languages.registerReferenceProvider({ language }, this._referenceProvider),
			vscode.languages.registerRenameProvider({ language }, this._renameProvider),
			// Note: Load same-line code lenses in inverted order of appearance.
			vscode.languages.registerCodeLensProvider({ language }, this._connectionCodelensProvider),
			vscode.languages.registerCodeLensProvider({ language }, this._validationCodelensProvider),
			vscode.languages.registerCodeLensProvider({ language }, this._notebookSlugCodelensProvider),
		]
	}
}

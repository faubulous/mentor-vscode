import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { VocabularyRepository } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService, IPrefixLookupService } from '@src/services/document';
import {
	ISparqlConnectionRegistry,
	ISparqlQueryService,
	ITripleStoreConfigService,
	IGraphManagementService,
	IDocumentConnectionService
} from '@src/languages/sparql/services';
import {
	ResourceReferenceProvider,
	ResourceDefinitionProvider,
	WorkspaceGraphDefinitionProvider,
	NotebookCellSlugCodeLensProvider
} from '@src/providers';
import {
	TurtleAutoDefinePrefixProvider,
	TurtleCodeActionsProvider,
	TurtlePrefixCompletionProvider
} from '@src/languages/turtle/providers';
import {
	SparqlCodeLensProvider,
	SparqlCompletionItemProvider,
	SparqlCodeFormattingProvider,
	SparqlGraphDiagnosticProvider,
	SparqlRenameProvider
} from '@src/languages/sparql/providers';
import { SparqlPrefixDefinitionService } from '@src/languages/sparql/services/sparql-prefix-definition-service';

/**
 * Registers the language feature providers for the SPARQL language.
 *
 * This is a composition point: services are resolved from the container once
 * and passed into the provider constructors.
 */
export class SparqlTokenProvider {
	constructor() {
		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const vocabulary = container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
		const prefixLookup = container.resolve<IPrefixLookupService>(ServiceToken.PrefixLookupService);
		const connectionRegistry = container.resolve<ISparqlConnectionRegistry>(ServiceToken.SparqlConnectionRegistry);
		const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
		const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
		const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
		const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);

		const codeActionsProvider = new TurtleCodeActionsProvider(contextService);
		const codeLensProvider = new SparqlCodeLensProvider(connectionRegistry, documentConnectionService, storeConfigService, queryService);
		const notebookSlugCodelensProvider = new NotebookCellSlugCodeLensProvider(contextService);
		const completionProvider = new SparqlCompletionItemProvider(contextService, vocabulary, connectionRegistry, documentConnectionService, graphService);
		const definitionProvider = new ResourceDefinitionProvider(contextService);
		const workspaceGraphDefinitionProvider = new WorkspaceGraphDefinitionProvider(contextService);
		const formattingProvider = new SparqlCodeFormattingProvider();
		const prefixCompletionProvider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}>`, contextService, prefixLookup);
		const referenceProvider = new ResourceReferenceProvider(contextService);
		const renameProvider = new SparqlRenameProvider(contextService);
		const prefixDefinitionService = container.resolve<SparqlPrefixDefinitionService>(ServiceToken.SparqlPrefixDefinitionService);
		const autoDefinePrefixProvider = new TurtleAutoDefinePrefixProvider(['sparql'], prefixDefinitionService, contextService);
		const graphDiagnosticProvider = new SparqlGraphDiagnosticProvider(documentConnectionService, graphService);

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(
			autoDefinePrefixProvider,
			graphDiagnosticProvider,
			vscode.languages.registerCodeActionsProvider({ language: 'sparql' }, codeActionsProvider),
			vscode.languages.registerCodeLensProvider({ language: 'sparql' }, codeLensProvider),
			vscode.languages.registerCompletionItemProvider({ language: 'sparql' }, completionProvider, ...completionProvider.triggerCharacters),
			vscode.languages.registerDefinitionProvider({ language: 'sparql' }, definitionProvider),
			vscode.languages.registerDefinitionProvider({ language: 'sparql' }, workspaceGraphDefinitionProvider),
			vscode.languages.registerDocumentFormattingEditProvider({ language: 'sparql' }, formattingProvider),
			vscode.languages.registerInlineCompletionItemProvider({ language: 'sparql' }, prefixCompletionProvider),
			vscode.languages.registerReferenceProvider({ language: 'sparql' }, referenceProvider),
			vscode.languages.registerRenameProvider({ language: 'sparql' }, renameProvider),
			vscode.languages.registerCodeLensProvider({ language: 'sparql' }, notebookSlugCodelensProvider),
		);
	}
}

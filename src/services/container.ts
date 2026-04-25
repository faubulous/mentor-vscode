import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store, OwlReasoner, GraphUriGenerator, VocabularyRepository } from '@faubulous/mentor-rdf';
import { Quad_Graph } from '@rdfjs/types';
import { ServiceToken } from './tokens';
import { InferenceUri } from '../providers/inference-uri';
import { DocumentFactory } from './document/document-factory';
import { WorkspaceIndexerService } from './core/workspace-indexer-service';
import { WorkspaceFileService } from './core/workspace-file-service';
import { WorkspaceService } from './core/workspace-service';
import { DocumentContextService } from './document/document-context-service';
import { SettingsService } from './core/settings-service';
import { CredentialStorageService } from './core/credential-storage-service';
import { PrefixDownloaderService } from './document/prefix-downloader-service';
import { PrefixLookupService } from './document/prefix-lookup-service';
import { LanguageClientFactory } from '@src/languages/language-client-factory';
import { SparqlQueryService } from '@src/languages/sparql/services/sparql-query-service';
import { SparqlConnectionService } from '@src/languages/sparql/services/sparql-connection-service';
import { SparqlResultSerializer } from '@src/languages/sparql/services/sparql-result-serializer';
import { TurtlePrefixDefinitionService } from '@src/languages/turtle/services/turtle-prefix-definition-service';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';

/**
 * Graph URI generator that creates inference URIs for RDF graphs.
 */
export class MentorGraphUriGenerator implements GraphUriGenerator {
	getGraphUri(uri: string | Quad_Graph): string {
		const value = typeof uri === 'string' ? uri : uri.value;
		return InferenceUri.toInferenceUri(value);
	}
}

/**
 * Configures the service container with all necessary services and dependencies for the extension.
 * @param context The VS Code extension context, used for registering services that require access to the extension's lifecycle and storage.
 * @param languageClientFactory Platform-specific factory for creating language clients.
 */
export function configureServiceContainer(context: vscode.ExtensionContext, languageClientFactory: LanguageClientFactory): void {
	// Register VS Code services and extension context.
	container.registerInstance(ServiceToken.ExtensionContext, context);

	// Register application services.
	const settingsService = new SettingsService();
	container.registerInstance(ServiceToken.SettingsService, settingsService);

	const reasoner = new OwlReasoner(new MentorGraphUriGenerator());
	const store = new Store(reasoner);

	container.registerInstance(ServiceToken.Store, store);

	const vocabularyRepository = new VocabularyRepository(store);
	container.registerInstance(ServiceToken.VocabularyRepository, vocabularyRepository);

	const credentialStorageService = new CredentialStorageService();
	container.registerInstance(ServiceToken.CredentialStorageService, credentialStorageService);

	const documentFactory = new DocumentFactory();
	container.registerInstance(ServiceToken.DocumentFactory, documentFactory);

	const documentContextService = new DocumentContextService(context, store, vocabularyRepository, documentFactory);
	container.registerInstance(ServiceToken.DocumentContextService, documentContextService);

	const workspaceService = new WorkspaceService();
	container.registerInstance(ServiceToken.WorkspaceService, workspaceService);

	const workspaceFileService = new WorkspaceFileService(documentFactory);
	container.registerInstance(ServiceToken.WorkspaceFileService, workspaceFileService);

	const workspaceIndexerService = new WorkspaceIndexerService(documentFactory, documentContextService, workspaceFileService);
	container.registerInstance(ServiceToken.WorkspaceIndexerService, workspaceIndexerService);

	const sparqlConnectionService = new SparqlConnectionService(context, credentialStorageService);
	container.registerInstance(ServiceToken.SparqlConnectionService, sparqlConnectionService);

	const prefixDownloaderService = new PrefixDownloaderService();
	container.registerInstance(ServiceToken.PrefixDownloaderService, prefixDownloaderService);

	const prefixLookupService = new PrefixLookupService(context, documentContextService);
	container.registerInstance(ServiceToken.PrefixLookupService, prefixLookupService);

	const sparqlQueryResultSerializer = new SparqlResultSerializer(prefixLookupService);
	container.registerInstance(ServiceToken.SparqlQueryResultSerializer, sparqlQueryResultSerializer);

	const sparqlQueryService = new SparqlQueryService(context, credentialStorageService, sparqlConnectionService, sparqlQueryResultSerializer);
	container.registerInstance(ServiceToken.SparqlQueryService, sparqlQueryService);

	const turtlePrefixDefinitionService = new TurtlePrefixDefinitionService(documentContextService, prefixLookupService);
	container.registerInstance(ServiceToken.TurtlePrefixDefinitionService, turtlePrefixDefinitionService);

	// Register the platform-specific language client factory.
	container.registerInstance(ServiceToken.LanguageClientFactory, languageClientFactory);

	// Register the SHACL validation service.
	const shaclValidationService = new ShaclValidationService();
	container.registerInstance(ServiceToken.ShaclValidationService, shaclValidationService);
}
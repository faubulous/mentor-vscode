import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store, OwlReasoner, GraphUriGenerator, VocabularyRepository } from '@faubulous/mentor-rdf';
import { Quad_Graph } from '@rdfjs/types';
import { ServiceToken } from './tokens';
import { InferenceUri } from '../providers/core/inference-uri';
import { DocumentFactory } from './document/document-factory';
import { WorkspaceIndexerService } from './core/workspace-indexer-service';
import { WorkspaceFileService } from './core/workspace-file-service';
import { DocumentContextService } from './document/document-context-service';
import { SettingsService } from './core/settings-service';
import { CredentialStorageService } from './core/credential-storage-service';
import { PrefixDownloaderService } from './document/prefix-downloader-service';
import { PrefixLookupService } from './document/prefix-lookup-service';
import { SparqlConnectionService } from './sparql/sparql-connection-service';
import { SparqlResultSerializer } from './sparql/sparql-result-serializer';
import { SparqlQueryService } from './sparql/sparql-query-service';
import { TurtlePrefixDefinitionService } from '../languages/turtle/services/turtle-prefix-definition-service';

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
 */
export function configureServiceContainer(context: vscode.ExtensionContext): void {
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

	const documentContextService = new DocumentContextService(context, vocabularyRepository, documentFactory);
	container.registerInstance(ServiceToken.DocumentContextService, documentContextService);

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
}
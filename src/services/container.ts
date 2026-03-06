import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store, OwlReasoner, GraphUriGenerator, VocabularyRepository } from '@faubulous/mentor-rdf';
import { Quad_Graph } from '@rdfjs/types';
import { ServiceToken } from './tokens';
import { InferenceUri } from '../workspace/inference-uri';
import { DocumentFactory } from '../workspace/document-factory';
import { WorkspaceRepository } from '../workspace/workspace-repository';
import { WorkspaceIndexer } from '../workspace/workspace-indexer';
import { ConfigurationService } from './core/configuration-service';
import { DocumentContextService } from './core/document-context-service';
import { SettingsService } from './core/settings-service';
import { CredentialStorageService } from './core/credential-storage-service';
import { PrefixDownloaderService } from './core/prefix-downloader-service';
import { PrefixLookupService } from './core/prefix-lookup-service';
import { SparqlConnectionService } from './sparql/sparql-connection-service';
import { SparqlQueryResultSerializer } from './sparql/sparql-query-result-serializer';
import { SparqlQueryService } from './sparql/sparql-query-service';
import { WorkspaceStorageService, GlobalStorageService } from './core/local-storage-service';
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
	const configurationProvider = new ConfigurationService();
	container.registerInstance(ServiceToken.ConfigurationService, configurationProvider);

	const settingsService = new SettingsService(configurationProvider);
	container.registerInstance(ServiceToken.SettingsService, settingsService);

	const reasoner = new OwlReasoner(new MentorGraphUriGenerator());
	const store = new Store(reasoner);
	container.registerInstance(ServiceToken.Store, store);

	const vocabularyRepository = new VocabularyRepository(store);
	container.registerInstance(ServiceToken.VocabularyRepository, vocabularyRepository);

	const globalStorageService = new GlobalStorageService();
	container.registerInstance(ServiceToken.GlobalStorageService, globalStorageService);

	const workspaceStorageService = new WorkspaceStorageService();
	container.registerInstance(ServiceToken.WorkspaceStorageService, workspaceStorageService);

	const credentialStorageService = new CredentialStorageService();
	container.registerInstance(ServiceToken.CredentialStorageService, credentialStorageService);

	const documentFactory = new DocumentFactory();
	container.registerInstance(ServiceToken.DocumentFactory, documentFactory);

	const documentContextService = new DocumentContextService(context, vocabularyRepository, documentFactory, configurationProvider);
	container.registerInstance(ServiceToken.DocumentContextService, documentContextService);

	const workspaceRepository = new WorkspaceRepository(documentFactory, configurationProvider);
	container.registerInstance(ServiceToken.WorkspaceRepository, workspaceRepository);

	const workspaceIndexer = new WorkspaceIndexer(documentFactory, configurationProvider, documentContextService);
	container.registerInstance(ServiceToken.WorkspaceIndexer, workspaceIndexer);

	const sparqlConnectionService = new SparqlConnectionService(configurationProvider, workspaceStorageService, credentialStorageService);
	container.registerInstance(ServiceToken.SparqlConnectionService, sparqlConnectionService);

	const prefixDownloaderService = new PrefixDownloaderService();
	container.registerInstance(ServiceToken.PrefixDownloaderService, prefixDownloaderService);

	const prefixLookupService = new PrefixLookupService(globalStorageService, configurationProvider, documentContextService);
	container.registerInstance(ServiceToken.PrefixLookupService, prefixLookupService);

	const sparqlQueryResultSerializer = new SparqlQueryResultSerializer(prefixLookupService);
	container.registerInstance(ServiceToken.SparqlQueryResultSerializer, sparqlQueryResultSerializer);

	const sparqlQueryService = new SparqlQueryService(context, workspaceStorageService, credentialStorageService, sparqlConnectionService, sparqlQueryResultSerializer);
	container.registerInstance(ServiceToken.SparqlQueryService, sparqlQueryService);

	const turtlePrefixDefinitionService = new TurtlePrefixDefinitionService(configurationProvider, documentContextService, prefixLookupService);
	container.registerInstance(ServiceToken.TurtlePrefixDefinitionService, turtlePrefixDefinitionService);
}
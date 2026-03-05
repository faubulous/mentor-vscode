import "reflect-metadata";
import * as vscode from "vscode";
import { container, DependencyContainer } from "tsyringe";
import { Store, OwlReasoner, GraphUriGenerator, VocabularyRepository } from '@faubulous/mentor-rdf';
import { Quad_Graph } from '@rdfjs/types';
import { ServiceToken } from './service-token';
import { InferenceUri } from './workspace/inference-uri';
import { DocumentFactory } from './workspace/document-factory';
import { ConfigurationService } from './services/configuration-service';
import { DocumentContextService } from './services/document-context-service';
import { WorkspaceRepository } from './workspace/workspace-repository';
import { WorkspaceIndexer } from './workspace/workspace-indexer';
import { SettingsService } from './services/settings-service';
import { WorkspaceStorageService, GlobalStorageService, CredentialStorageService, SparqlConnectionService, SparqlQueryService, PrefixLookupService, PrefixDownloaderService, SparqlQueryResultSerializer } from './services';
import { TurtlePrefixDefinitionService } from './languages/turtle/services/turtle-prefix-definition-service';

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
 * @returns DependencyContainer instance with all services registered and ready for use throughout the extension.
 */
export function configureServiceContainer(context: vscode.ExtensionContext): DependencyContainer {
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

	const vocabulary = new VocabularyRepository(store);
	container.registerInstance(ServiceToken.VocabularyRepository, vocabulary);

	const documentFactory = new DocumentFactory();
	container.registerInstance(ServiceToken.DocumentFactory, documentFactory);

	const workspaceStorageService = new WorkspaceStorageService();
	container.registerInstance(ServiceToken.WorkspaceStorageService, workspaceStorageService);

	const globalStorageService = new GlobalStorageService();
	container.registerInstance(ServiceToken.GlobalStorageService, globalStorageService);

	const credentialStorageService = new CredentialStorageService();
	container.registerInstance(ServiceToken.CredentialStorageService, credentialStorageService);

	const documentContextService = new DocumentContextService(vocabulary, documentFactory, configurationProvider);
	container.registerInstance(ServiceToken.DocumentContextService, documentContextService);

	const workspaceRepository = new WorkspaceRepository(documentFactory, configurationProvider);
	container.registerInstance(ServiceToken.WorkspaceRepository, workspaceRepository);

	const workspaceIndexer = new WorkspaceIndexer(documentFactory, configurationProvider, documentContextService);
	container.registerInstance(ServiceToken.WorkspaceIndexer, workspaceIndexer);

	const sparqlConnectionService = new SparqlConnectionService(configurationProvider, workspaceStorageService, credentialStorageService);
	container.registerInstance(ServiceToken.SparqlConnectionService, sparqlConnectionService);

	const prefixLookupService = new PrefixLookupService(globalStorageService, configurationProvider, documentContextService);
	container.registerInstance(ServiceToken.PrefixLookupService, prefixLookupService);

	const sparqlQueryResultSerializer = new SparqlQueryResultSerializer(prefixLookupService);
	container.registerInstance(ServiceToken.SparqlQueryResultSerializer, sparqlQueryResultSerializer);

	const sparqlQueryService = new SparqlQueryService(sparqlConnectionService, workspaceStorageService, credentialStorageService, sparqlQueryResultSerializer);
	container.registerInstance(ServiceToken.SparqlQueryService, sparqlQueryService);

	const prefixDownloaderService = new PrefixDownloaderService();
	container.registerInstance(ServiceToken.PrefixDownloaderService, prefixDownloaderService);

	const turtlePrefixDefinitionService = new TurtlePrefixDefinitionService(configurationProvider, documentContextService, prefixLookupService);
	container.registerInstance(ServiceToken.TurtlePrefixDefinitionService, turtlePrefixDefinitionService);

	return container;
}

/**
 * Export the container for direct access when needed.
 */
export { container };

/**
 * Re-export core RDF services for convenient access.
 */
export { VocabularyRepository, Store, OwlReasoner };

/**
 * Re-export DocumentContextService for convenient access.
 */
export { DocumentContextService };

/**
 * Re-export DocumentFactory for convenient access.
 */
export { DocumentFactory };

/**
 * Re-export WorkspaceIndexer for convenient access.
 */
export { WorkspaceIndexer };

/**
 * Re-export WorkspaceRepository for convenient access.
 */
export { WorkspaceRepository };

/**
 * Re-export PrefixDownloaderService for convenient access.
 */
export { PrefixDownloaderService };

/**
 * Re-export ConfigurationProvider for convenient access.
 */
export { ConfigurationService as ConfigurationProvider };

/**
 * Re-export storage services for convenient access.
 */
export { WorkspaceStorageService, GlobalStorageService };

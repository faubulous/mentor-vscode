import "reflect-metadata";
import * as vscode from "vscode";
import { container, DependencyContainer } from "tsyringe";
import { Store, OwlReasoner, GraphUriGenerator, VocabularyRepository } from '@faubulous/mentor-rdf';
import { Quad_Graph } from '@rdfjs/types';
import { InjectionToken } from './injection-token';
import { InferenceUri } from './workspace/inference-uri';
import { DocumentFactory } from './workspace/document-factory';
import { ConfigurationProvider } from './services/configuration-provider';
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
 * Registers all services in the DI container.
 * Call this once at extension activation.
 */
export function configureDependencyContainer(context: vscode.ExtensionContext): DependencyContainer {
	// Register VS Code services and extension context.
	container.registerInstance(InjectionToken.ExtensionContext, context);
	container.registerInstance(InjectionToken.SecretStorage, context.secrets);

	// Register application services.
	const configurationProvider = new ConfigurationProvider();
	container.registerInstance(InjectionToken.ConfigurationProvider, configurationProvider);

	const settingsService = new SettingsService(configurationProvider);
	container.registerInstance(InjectionToken.SettingsService, settingsService);

	const reasoner = new OwlReasoner(new MentorGraphUriGenerator());
	const store = new Store(reasoner);
	container.registerInstance(InjectionToken.Store, store);

	const vocabulary = new VocabularyRepository(store);
	container.registerInstance(InjectionToken.VocabularyRepository, vocabulary);

	const documentFactory = new DocumentFactory();
	container.registerInstance(InjectionToken.DocumentFactory, documentFactory);

	const workspaceStorageService = new WorkspaceStorageService();
	container.registerInstance(InjectionToken.WorkspaceStorageService, workspaceStorageService);

	const globalStorageService = new GlobalStorageService();
	container.registerInstance(InjectionToken.GlobalStorageService, globalStorageService);

	const credentialStorageService = new CredentialStorageService();
	container.registerInstance(InjectionToken.CredentialStorageService, credentialStorageService);

	const documentContextService = new DocumentContextService(vocabulary, documentFactory, configurationProvider);
	container.registerInstance(InjectionToken.DocumentContextService, documentContextService);

	const workspaceRepository = new WorkspaceRepository(documentFactory, configurationProvider);
	container.registerInstance(InjectionToken.WorkspaceRepository, workspaceRepository);

	const workspaceIndexer = new WorkspaceIndexer(documentFactory, configurationProvider, documentContextService);
	container.registerInstance(InjectionToken.WorkspaceIndexer, workspaceIndexer);

	const sparqlConnectionService = new SparqlConnectionService(configurationProvider, workspaceStorageService, credentialStorageService);
	container.registerInstance(InjectionToken.SparqlConnectionService, sparqlConnectionService);

	const prefixLookupService = new PrefixLookupService(globalStorageService, configurationProvider, documentContextService);
	container.registerInstance(InjectionToken.PrefixLookupService, prefixLookupService);

	const sparqlQueryResultSerializer = new SparqlQueryResultSerializer(prefixLookupService);
	container.registerInstance(InjectionToken.SparqlQueryResultSerializer, sparqlQueryResultSerializer);

	const sparqlQueryService = new SparqlQueryService(sparqlConnectionService, workspaceStorageService, credentialStorageService, sparqlQueryResultSerializer);
	container.registerInstance(InjectionToken.SparqlQueryService, sparqlQueryService);

	const prefixDownloaderService = new PrefixDownloaderService();
	container.registerInstance(InjectionToken.PrefixDownloaderService, prefixDownloaderService);

	const turtlePrefixDefinitionService = new TurtlePrefixDefinitionService(configurationProvider, documentContextService, prefixLookupService);
	container.registerInstance(InjectionToken.TurtlePrefixDefinitionService, turtlePrefixDefinitionService);

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
export { ConfigurationProvider };

/**
 * Re-export storage services for convenient access.
 */
export { WorkspaceStorageService, GlobalStorageService };

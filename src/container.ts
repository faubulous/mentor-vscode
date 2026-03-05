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
import { Settings } from './settings';
import { LocalStorageService, WorkspaceStorageService, GlobalStorageService, CredentialStorageService, SparqlConnectionService, SparqlQueryService, PrefixLookupService, PrefixDownloaderService, SparqlQueryResultSerializer } from './services';
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
	// Register the ExtensionContext and SecretStorage directly
	container.registerInstance(InjectionToken.ExtensionContext, context);
	container.registerInstance(InjectionToken.SecretStorage, context.secrets);

	// Register ConfigurationProvider instance
	const configurationProvider = new ConfigurationProvider();
	container.registerInstance(InjectionToken.ConfigurationProvider, configurationProvider);

	// Create singleton instances for the core RDF services
	const reasoner = new OwlReasoner(new MentorGraphUriGenerator());
	const store = new Store(reasoner);
	const vocabulary = new VocabularyRepository(store);

	// Register them as singleton instances using string tokens for external classes
	container.registerInstance(InjectionToken.Store, store);
	container.registerInstance(InjectionToken.VocabularyRepository, vocabulary);

	// Register DocumentFactory instance
	const documentFactory = new DocumentFactory();
	container.registerInstance(InjectionToken.DocumentFactory, documentFactory);

	// Register storage services (they use container.resolve internally for ExtensionContext)
	const workspaceStorageService = new WorkspaceStorageService();
	container.registerInstance(InjectionToken.WorkspaceStorageService, workspaceStorageService);

	const globalStorageService = new GlobalStorageService();
	container.registerInstance(InjectionToken.GlobalStorageService, globalStorageService);

	// Register CredentialStorageService (uses container.resolve internally for SecretStorage)
	const credentialStorageService = new CredentialStorageService();
	container.registerInstance(InjectionToken.CredentialStorageService, credentialStorageService);

	// Create DocumentContextService instance
	const documentContextService = new DocumentContextService(vocabulary, documentFactory, configurationProvider);
	container.registerInstance(InjectionToken.DocumentContextService, documentContextService);

	// Register WorkspaceRepository instance
	const workspaceRepository = new WorkspaceRepository(documentFactory, configurationProvider);
	container.registerInstance(InjectionToken.WorkspaceRepository, workspaceRepository);

	// Register WorkspaceIndexer instance
	const workspaceIndexer = new WorkspaceIndexer(documentFactory, configurationProvider, documentContextService);
	container.registerInstance(InjectionToken.WorkspaceIndexer, workspaceIndexer);

	// Register SparqlConnectionService instance
	const sparqlConnectionService = new SparqlConnectionService(configurationProvider, workspaceStorageService, credentialStorageService);
	container.registerInstance(InjectionToken.SparqlConnectionService, sparqlConnectionService);

	// Register PrefixLookupService instance
	const prefixLookupService = new PrefixLookupService(globalStorageService, configurationProvider, documentContextService);
	container.registerInstance(InjectionToken.PrefixLookupService, prefixLookupService);

	// Register SparqlQueryResultSerializer instance
	const sparqlQueryResultSerializer = new SparqlQueryResultSerializer(prefixLookupService);
	container.registerInstance(InjectionToken.SparqlQueryResultSerializer, sparqlQueryResultSerializer);

	// Register SparqlQueryService instance
	const sparqlQueryService = new SparqlQueryService(sparqlConnectionService, workspaceStorageService, credentialStorageService, sparqlQueryResultSerializer);
	container.registerInstance(InjectionToken.SparqlQueryService, sparqlQueryService);

	// Register PrefixDownloaderService instance
	const prefixDownloaderService = new PrefixDownloaderService();
	container.registerInstance(InjectionToken.PrefixDownloaderService, prefixDownloaderService);

	// Register TurtlePrefixDefinitionService instance
	const turtlePrefixDefinitionService = new TurtlePrefixDefinitionService(configurationProvider, documentContextService, prefixLookupService);
	container.registerInstance(InjectionToken.TurtlePrefixDefinitionService, turtlePrefixDefinitionService);

	// Register Settings instance
	const settings = new Settings();
	container.registerInstance(InjectionToken.Settings, settings);

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

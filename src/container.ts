/**
 * Dependency Injection Container Configuration
 * 
 * This module configures tsyringe for the Mentor extension.
 * Import this module at the extension entry point before resolving any services.
 */
import "reflect-metadata";
import * as vscode from "vscode";
import { container, DependencyContainer, injectable } from "tsyringe";
import { Store, OwlReasoner, GraphUriGenerator, VocabularyRepository } from '@faubulous/mentor-rdf';
import { Quad_Graph } from '@rdfjs/types';
import { InferenceUri } from './workspace/inference-uri';
import { DocumentFactory } from './workspace/document-factory';
import { DocumentContextManager } from './workspace/document-context-manager';
import { WorkspaceRepository } from './workspace/workspace-repository';
import { WorkspaceIndexer } from './workspace/workspace-indexer';
import { Settings } from './settings';
import { LocalStorageService, CredentialStorageService, SparqlConnectionService, SparqlQueryService, PrefixLookupService, PrefixDownloaderService, SparqlQueryResultSerializer } from './services';
import { TurtlePrefixDefinitionService } from './languages/turtle/services/turtle-prefix-definition-service';

/**
 * Injectable wrapper for VS Code ExtensionContext.
 */
@injectable()
export class ExtensionContextToken {
	constructor(public readonly value: vscode.ExtensionContext) {}
}

/**
 * Injectable wrapper for VS Code SecretStorage.
 */
@injectable()
export class SecretStorageToken {
	constructor(public readonly value: vscode.SecretStorage) {}
}

/**
 * Injectable wrapper providing configuration getter.
 * Returns fresh configuration on each call to capture updates.
 */
@injectable()
export class ConfigurationProvider {
	get(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration('mentor');
	}

	/**
	 * Gets the list of patterns to exclude from indexing operations.
	 * @param workspaceUri The workspace URI to get patterns for.
	 * @returns An array of glob patterns to exclude.
	 */
	async getExcludePatterns(workspaceUri: vscode.Uri): Promise<string[]> {
		const config = this.get();
		const result = new Set<string>();

		// Add the patterns from the configuration.
		for (const pattern of config.get<string[]>('index.ignoreFolders', [])) {
			result.add(pattern);
		}

		// Add the patterns from the .gitignore file if enabled.
		if (config.get<boolean>('index.useGitIgnore')) {
			const gitignore = vscode.Uri.joinPath(workspaceUri, '.gitignore');

			try {
				const content = await vscode.workspace.fs.readFile(gitignore);

				const excludePatterns = new TextDecoder().decode(content)
					.split('\n')
					.filter(line => !line.startsWith('#') && line.trim() !== '');

				for (const pattern of excludePatterns) {
					result.add(pattern);
				}
			} catch {
				// If the .gitignore file does not exist, ignore it.
			}
		}

		return Array.from(result);
	}
}

/**
 * Injectable wrapper for workspace-scoped storage.
 */
@injectable()
export class WorkspaceStorageService extends LocalStorageService {}

/**
 * Injectable wrapper for global storage.
 */
@injectable()
export class GlobalStorageService extends LocalStorageService {}

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
export function configureContainer(): DependencyContainer {
	// Register ConfigurationProvider singleton
	container.registerSingleton(ConfigurationProvider);

	// Create singleton instances for the core RDF services
	const reasoner = new OwlReasoner(new MentorGraphUriGenerator());
	const store = new Store(reasoner);
	const vocabulary = new VocabularyRepository(store);

	// Register them as singleton instances using string tokens for external classes
	container.registerInstance("OwlReasoner", reasoner);
	container.registerInstance("Store", store);
	container.registerInstance("VocabularyRepository", vocabulary);

	container.registerSingleton(DocumentFactory);

	// Create DocumentContextManager instance manually to avoid circular dependency with ConfigurationProvider
	const documentContextManager = new DocumentContextManager(
		vocabulary,
		container.resolve(DocumentFactory),
		container.resolve(ConfigurationProvider)
	);
	container.registerInstance(DocumentContextManager, documentContextManager);

	// Register WorkspaceRepository and WorkspaceIndexer
	container.registerSingleton(WorkspaceRepository);
	container.registerSingleton(WorkspaceIndexer);

	container.registerSingleton(CredentialStorageService);

	// Register SparqlConnectionService (dependencies resolved at runtime)
	container.registerSingleton(SparqlConnectionService);

	// Register SparqlQueryResultSerializer
	container.registerSingleton(SparqlQueryResultSerializer);

	// Register SparqlQueryService
	container.registerSingleton(SparqlQueryService);

	// Register PrefixLookupService
	container.registerSingleton(PrefixLookupService);

	// Register PrefixDownloaderService
	container.registerSingleton(PrefixDownloaderService);

	// Register TurtlePrefixDefinitionService
	container.registerSingleton(TurtlePrefixDefinitionService);

	// Register Settings
	container.registerSingleton(Settings);

	return container;
}

/**
 * Registers runtime dependencies.
 * Call this at extension activation with the ExtensionContext.
 */
export function registerDependencies(context: vscode.ExtensionContext): void {
	container.register(ExtensionContextToken, { useValue: new ExtensionContextToken(context) });
	container.register(SecretStorageToken, { useValue: new SecretStorageToken(context.secrets) });

	const workspaceStorage = new WorkspaceStorageService();

	workspaceStorage.initialize(context.workspaceState);
	container.registerInstance(WorkspaceStorageService, workspaceStorage);

	const globalStorage = new GlobalStorageService();

	globalStorage.initialize(context.globalState);
	container.registerInstance(GlobalStorageService, globalStorage);

	const credentialStorage = container.resolve(CredentialStorageService);

	credentialStorage.initialize(context.secrets);
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
 * Re-export DocumentContextManager for convenient access.
 */
export { DocumentContextManager };

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

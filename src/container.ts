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
import { LocalStorageService, CredentialStorageService } from './services';

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
@injectable()
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

	// Register MentorGraphUriGenerator as GraphUriGenerator
	container.registerSingleton<GraphUriGenerator>("GraphUriGenerator", MentorGraphUriGenerator);

	container.register(OwlReasoner, {
		useFactory: (c) => new OwlReasoner(c.resolve<GraphUriGenerator>("GraphUriGenerator"))
	});

	container.register(Store, {
		useFactory: (c) => new Store(c.resolve(OwlReasoner))
	});

	container.register(VocabularyRepository, {
		useFactory: (c) => new VocabularyRepository(c.resolve(Store))
	});

	container.registerSingleton(DocumentFactory);

	container.register(DocumentContextManager, {
		useFactory: (c) => new DocumentContextManager(
			c.resolve(Store),
			c.resolve(VocabularyRepository),
			c.resolve(DocumentFactory),
			c.resolve(ConfigurationProvider)
		)
	});

	container.registerSingleton(CredentialStorageService);

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

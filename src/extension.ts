'use strict';
import 'reflect-metadata';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { configureServiceContainer } from './services/container';
import { ServiceToken } from './services/tokens';
import { IWorkspaceFileService } from './services/core';
import { WorkspaceIndexerService } from './services/core/workspace-indexer-service';
import { NotebookSerializer } from './services/notebook/notebook-serializer';
import { NotebookController } from './services/notebook/notebook-controller';
import { DocumentLintingService } from './services/document/document-linting-service';
import { LanguageClientFactory } from './languages/language-client-factory';
import * as languages from './languages';
import * as commands from './commands';
import * as trees from './views/trees';
import * as webviews from './views/webviews';
import * as providers from './providers';

/**
 * Shared activation logic for both browser and Node.js extension hosts.
 * @param context The extension context.
 * @param languageClientFactory Platform-specific factory for creating language clients.
 */
export async function activateExtension(context: vscode.ExtensionContext, languageClientFactory: LanguageClientFactory) {
	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

	configureServiceContainer(context, languageClientFactory);

	await loadFrameworkOntologies();

	registerLanguages();
	registerProviders();
	registerCommands(context);
	registerViews();
	registerNotebookSerializers();

	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', false);

	// Do not await this, to allow the extension to finish activating while indexing 
	// is still in progress. This may cause some language features to not be available 
	// until indexing is complete, but provides a better user experience overall.
	indexWorkspace();
}

export async function deactivate() {
	// All disposables are automatically cleaned up via context.subscriptions
}

/**
 * Registers all language clients and token providers for supported languages.
 */
function registerLanguages() {
	// Register the language clients for supported languages.
	new languages.N3LanguageClient();
	new languages.NQuadsLanguageClient();
	new languages.NTriplesLanguageClient();
	new languages.SparqlLanguageClient();
	new languages.TrigLanguageClient();
	new languages.TurtleLanguageClient();

	// Token providers must be registered after the language clients.
	new languages.DatalogTokenProvider();
	new languages.SparqlTokenProvider();
	new languages.TrigTokenProvider();
	new languages.TurtleTokenProvider();
	new languages.XmlLanguageClient();
	new languages.XmlTokenProvider();
}

/**
 * Registers the notebook serializer and controller for the Mentor Notebook.
 */
function registerNotebookSerializers() {
	new NotebookController();
	new NotebookSerializer();
}

/**
 * Registers various providers for language features, file system access and URI handling.
 */
function registerProviders() {
	new DocumentLintingService();
	new providers.WorkspaceUriLinkProvider();
	new providers.WorkspaceFileSystemProvider();
	new providers.InferenceUriLinkProvider();
	new providers.InferenceUriHandler();
}

/**
 * Registers tree views and webviews for the extension.
 */
function registerViews() {
	new trees.WorkspaceTree();
	new trees.DefinitionTree();

	// Create registry and register all webview controllers..
	const registry = new webviews.WebviewControllerRegistry(ServiceToken.WebviewControllerRegistry);
	registry.register(ServiceToken.SparqlResultsController, new webviews.SparqlResultsController());
	registry.register(ServiceToken.SparqlConnectionController, new webviews.SparqlConnectionController());
	registry.register(ServiceToken.SparqlConnectionsListController, new webviews.SparqlConnectionsListController());
}

/**
 * Registers all commands for the extension.
 */
function registerCommands(context: vscode.ExtensionContext) {
	// Register all commands exported in the commands module.
	for (const command of Object.values(commands)) {
		context.subscriptions.push(vscode.commands.registerCommand(command.id, command.handler));
	}
}

/**
 * Loads the RDF framework ontologies into the store, which are required for providing completions and hovers for built-in concepts.
 */
async function loadFrameworkOntologies() {
	const store = container.resolve<Store>(ServiceToken.Store);
	await store.loadFrameworkOntologies();
}

/**
 * Indexes the entire workspace to provide language features such as hovers, completions and definitions. This is done on activation to ensure that these features are available immediately after the extension is activated.
 */
async function indexWorkspace() {
	// Discover all supported files in the workspace.
	const workspaceFileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);
	await workspaceFileService.discoverFiles();

	// Index the entire workspace for providing hovers, completions and definitions.
	const workspaceIndexerService = container.resolve<WorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
	await workspaceIndexerService.indexWorkspace();
}

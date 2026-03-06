'use strict';
import 'reflect-metadata';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { NotebookSerializer } from './workspace/notebook-serializer';
import { NotebookController } from './workspace/notebook-controller';
import { WorkspaceRepository } from './workspace/workspace-repository';
import { WorkspaceIndexer } from './workspace/workspace-indexer';
import { ServiceToken } from './services/tokens';
import { configureServiceContainer } from './services/container';
import * as languages from './languages';
import * as commands from './commands';
import * as trees from './views/trees';
import * as webviews from './views/webviews';
import * as providers from './providers';

export async function activate(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

	configureServiceContainer(context);

	registerLanguages();
	registerProviders();
	registerUriHandlers();
	registerCommands();
	registerViews();
	registerNotebookSerializers();

	await loadFrameworkOntologies();

	await indexWorkspace();

	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', false);
}

export async function deactivate() {
	// All disposables are automatically cleaned up via context.subscriptions
}

/**
 * Registers all language clients and token providers for supported languages.
 */
function registerLanguages() {
	new languages.N3LanguageClient();
	new languages.NQuadsLanguageClient();
	new languages.NTriplesLanguageClient();
	new languages.SparqlLanguageClient();
	new languages.TrigLanguageClient();
	new languages.TurtleLanguageClient();

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
	new providers.DocumentLintingProvider();
	new providers.WorkspaceUriLinkProvider();
	new providers.WorkspaceFileSystemProvider();
	new providers.InferenceUriLinkProvider();
}

/**
 * Registers URI handlers for handling custom URIs within the extension.
 */
function registerUriHandlers() {
	new providers.InferenceUriHandler();
}

/**
 * Registers tree views and webviews for the extension.
 */
function registerViews() {
	new trees.WorkspaceTree();
	new trees.DefinitionTree();
	webviews.webviewRegistry.registerAll();
}

/**
 * Registers all commands for the extension.
 */
function registerCommands() {
	commands.commandRegistry.registerAll();
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
	// Initialize the workspace repository to load all files and folders in the workspace.
	const workspaceRepository = container.resolve<WorkspaceRepository>(ServiceToken.WorkspaceRepository);
	await workspaceRepository.initialize();

	// Index the entire workspace for providing hovers, completions and definitions.
	const workspaceIndexer = container.resolve<WorkspaceIndexer>(ServiceToken.WorkspaceIndexer);
	await workspaceIndexer.indexWorkspace();
}
'use strict';
import 'reflect-metadata';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { NotebookSerializer } from './workspace/notebook-serializer';
import { NotebookController } from './workspace/notebook-controller';
import { WorkspaceRepository } from './workspace/workspace-repository';
import { WorkspaceIndexer } from './workspace/workspace-indexer';
import { ServiceToken } from '@src/services/tokens';
import { configureServiceContainer } from './services/container';
import { IDocumentContextService } from './services/interfaces';
import * as languages from './languages';
import * as commands from './commands';
import * as trees from './views/trees';
import * as webviews from './views/webviews';
import * as providers from './providers';

export async function activate(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

	// Setup Dependency Injection container.
	configureServiceContainer(context);

	// Register application features (all self-register via DI).
	registerProviders();
	registerUriHandlers();
	registerLanguageClients(context);
	registerCommands();
	registerViews();
	registerNotebookSerializers();

	// Load the W3C and other common ontologies for providing hovers, completions and definitions.
	const store = container.resolve<Store>(ServiceToken.Store);
	await store.loadFrameworkOntologies();

	// Load the workspace files and folders for the explorer tree view.
	const workspaceRepository = container.resolve<WorkspaceRepository>(ServiceToken.WorkspaceRepository);
	await workspaceRepository.initialize();

	// Index the entire workspace for providing hovers, completions and definitions.
	const workspaceIndexer = container.resolve<WorkspaceIndexer>(ServiceToken.WorkspaceIndexer);
	await workspaceIndexer.indexWorkspace();

	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', false);
}

export async function deactivate(context: vscode.ExtensionContext) {
	const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	contextService.dispose();
}

function registerLanguageClients(context: vscode.ExtensionContext) {
	const clients: languages.LanguageClientBase[] = [
		new languages.TurtleLanguageClient(),
		new languages.TrigLanguageClient(),
		new languages.NQuadsLanguageClient(),
		new languages.NTriplesLanguageClient(),
		new languages.N3LanguageClient(),
		new languages.SparqlLanguageClient(),
		new languages.XmlLanguageClient()
	];

	for (const client of clients) {
		context.subscriptions.push(client);
		client.start(context);
	}
}

function registerNotebookSerializers() {
	new NotebookController();
	new NotebookSerializer();
}

function registerProviders() {
	new languages.DatalogTokenProvider();
	new languages.XmlTokenProvider();
	new languages.TurtleTokenProvider();
	new languages.TrigTokenProvider();
	new languages.SparqlTokenProvider();

	new providers.DocumentLintingProvider();
	new providers.WorkspaceUriLinkProvider();
	new providers.WorkspaceFileSystemProvider();
	new providers.InferenceUriLinkProvider();
}

function registerUriHandlers() {
	new providers.InferenceUriHandler();
}

function registerViews() {
	new trees.WorkspaceTree();
	new trees.DefinitionTree();
	webviews.webviewRegistry.registerAll();
}

function registerCommands() {
	commands.commandRegistry.registerAll();
}
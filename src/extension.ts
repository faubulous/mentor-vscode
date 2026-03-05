'use strict';
import "reflect-metadata";
import * as vscode from 'vscode';
import { Store } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import * as languages from './languages';
import * as commands from './commands';
import * as trees from './views/trees';
import * as webviews from './views/webviews';
import * as providers from './providers';
import { registerDependencies, configureContainer } from './container';
import { NotebookSerializer } from './workspace/notebook-serializer';
import { NotebookController } from './workspace/notebook-controller';
import { DocumentContextManager } from './workspace/document-context-manager';
import { WorkspaceRepository } from './workspace/workspace-repository';
import { WorkspaceIndexer } from './workspace/workspace-indexer';
import { SparqlConnectionService, SparqlQueryService } from './services';
import { Settings } from './settings';

export async function activate(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

	// Setup Dependency Injection container.
	configureContainer();
	registerDependencies(context);

	// Initialize services.
	const settings = container.resolve(Settings);
	settings.initialize(vscode.workspace.getConfiguration('mentor'));

	container.resolve(SparqlConnectionService).initialize();
	container.resolve(SparqlQueryService).initialize();

	// Register event handlers for editor and document changes.
	const contextManager = container.resolve(DocumentContextManager);

	subscribe(context, contextManager.registerEventHandlers());
	
	// Register application features.
	registerProviders(context);
	registerUriHandlers(context);
	registerLanguageClients(context);
	registerCommands(context);
	registerViews(context);
	registerNotebookSerializers(context);

	// Activate the current document if one is open.
	contextManager.activateDocument();

	// Load the W3C and other common ontologies for providing hovers, completions and definitions.
	await container.resolve<Store>("Store").loadFrameworkOntologies();

	// Load the workspace files and folders for the explorer tree view.
	await container.resolve(WorkspaceRepository).initialize();

	// Index the entire workspace for providing hovers, completions and definitions.
	await container.resolve(WorkspaceIndexer).indexWorkspace();

	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', false);
}

export async function deactivate(context: vscode.ExtensionContext) {
	container.resolve(SparqlQueryService).dispose();
	container.resolve(DocumentContextManager).dispose();
}

function subscribe(context: vscode.ExtensionContext, disposable: vscode.Disposable | vscode.Disposable[]) {
	if (Array.isArray(disposable)) {
		for (const d of disposable) {
			context.subscriptions.push(d);
		}
	} else {
		context.subscriptions.push(disposable);
	}
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
		subscribe(context, client);

		client.start(context);
	}
}

function registerNotebookSerializers(context: vscode.ExtensionContext) {
	subscribe(context, new NotebookController());
	subscribe(context, new NotebookSerializer().register());
}

function registerProviders(context: vscode.ExtensionContext) {
	subscribe(context, new languages.DatalogTokenProvider().register());
	subscribe(context, new languages.XmlTokenProvider().register());
	subscribe(context, new languages.TurtleTokenProvider().register());
	subscribe(context, new languages.TrigTokenProvider().register());
	subscribe(context, new languages.SparqlTokenProvider().register());
	subscribe(context, new providers.DocumentLintingProvider().register());
	subscribe(context, new providers.WorkspaceUriLinkProvider().register());
	subscribe(context, new providers.WorkspaceFileSystemProvider().register());
	subscribe(context, new providers.InferenceUriLinkProvider().register());
}

function registerUriHandlers(context: vscode.ExtensionContext) {
	subscribe(context, new providers.InferenceUriHandler(context).register());
}

function registerViews(context: vscode.ExtensionContext) {
	// TODO: Dispose the view providers in the trees.
	subscribe(context, new trees.WorkspaceTree().treeView);
	subscribe(context, new trees.DefinitionTree().treeView);
	subscribe(context, webviews.webviewRegistry.registerAll(context));
}

function registerCommands(context: vscode.ExtensionContext) {
	subscribe(context, commands.commandRegistry.registerAll());
}

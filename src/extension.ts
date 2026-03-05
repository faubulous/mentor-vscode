'use strict';
import "reflect-metadata";
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { NotebookSerializer } from './workspace/notebook-serializer';
import { NotebookController } from './workspace/notebook-controller';
import { WorkspaceRepository } from './workspace/workspace-repository';
import { WorkspaceIndexer } from './workspace/workspace-indexer';
import { ServiceToken, IDocumentContextService } from './services';
import { configureServiceContainer } from './services/service-container';
import * as languages from './languages';
import * as commands from './commands';
import * as trees from './views/trees';
import * as webviews from './views/webviews';
import * as providers from './providers';

export async function activate(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

	// Setup Dependency Injection container.
	configureServiceContainer(context);

	// Register application features.
	registerProviders(context);
	registerUriHandlers(context);
	registerLanguageClients(context);
	registerCommands(context);
	registerViews(context);
	registerNotebookSerializers(context);

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

function subscribe(context: vscode.ExtensionContext, disposable: vscode.Disposable | vscode.Disposable[]) {
	if (Array.isArray(disposable)) {
		for (const d of disposable) {
			context.subscriptions.push(d);
		}
	} else {
		context.subscriptions.push(disposable);
	}
}
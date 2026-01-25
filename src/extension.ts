'use strict';
import * as vscode from 'vscode';
import * as languages from './languages';
import * as commands from './commands';
import * as trees from './views/trees';
import * as webviews from './views/webviews';
import * as providers from './providers';
import { mentor } from './mentor';
import { NotebookSerializer } from './workspace/notebook-serializer';
import { NotebookController } from './workspace/notebook-controller';

export async function activate(context: vscode.ExtensionContext) {
	registerProviders(context);
	registerUriHandlers(context);
	registerLanguageClients(context);
	registerCommands(context);
	registerViews(context);
	registerNotebookSerializers(context);

	mentor.initialize(context);
}

export async function deactivate(context: vscode.ExtensionContext) {
	mentor.dispose();
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
		new languages.SparqlLanguageClient()
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
	subscribe(context, new trees.ConnectionTree().treeView);
	subscribe(context, webviews.webviewRegistry.registerAll(context));
}

function registerCommands(context: vscode.ExtensionContext) {
	subscribe(context, commands.commandRegistry.registerAll());
}

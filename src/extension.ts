'use strict';
require('setimmediate');
import * as vscode from 'vscode';
import * as languages from './languages';
import * as commands from './commands';
import * as views from './views';
import * as providers from './providers';
import * as webviews from './webviews';
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
	subscribe(context, new views.WorkspaceTree().treeView);
	subscribe(context, new views.DefinitionTree().treeView);
	subscribe(context, new views.EndpointTree().treeView);
	// Register all webview controllers via registry
	subscribe(context, webviews.webviewRegistry.registerAll(context));
}

function registerCommands(context: vscode.ExtensionContext) {
	subscribe(context, vscode.commands.registerCommand('mentor.command.createSparqlEndpoint', commands.createSparqlEndpoint));
	subscribe(context, vscode.commands.registerCommand('mentor.command.analyzeWorkspace', commands.analyzeWorkspace));
	subscribe(context, vscode.commands.registerCommand('mentor.command.clearQueryHistory', commands.clearQueryHistory));
	subscribe(context, vscode.commands.registerCommand('mentor.command.createNotebook', commands.createNotebook));
	subscribe(context, vscode.commands.registerCommand('mentor.command.createNotebookFromEditor', commands.createNotebookFromEditor));
	subscribe(context, vscode.commands.registerCommand('mentor.command.createSparqlQueryFile', commands.createSparqlQueryFile));
	subscribe(context, vscode.commands.registerCommand('mentor.command.deletePrefixes', commands.deletePrefixes));
	subscribe(context, vscode.commands.registerCommand('mentor.command.executeDescribeQuery', commands.executeDescribeQuery));
	subscribe(context, vscode.commands.registerCommand('mentor.command.editSparqlEndpoint', commands.editSparqlEndpoint));
	subscribe(context, vscode.commands.registerCommand('mentor.command.executeNotebookCell', commands.executeNotebookCell));
	subscribe(context, vscode.commands.registerCommand('mentor.command.executeSparqlQuery', commands.executeSparqlQuery));
	subscribe(context, vscode.commands.registerCommand('mentor.command.executeSparqlQueryFromActiveEditor', commands.executeSparqlQueryFromActiveEditor));
	subscribe(context, vscode.commands.registerCommand('mentor.command.executeSparqlQueryFromDocument', commands.executeSparqlQueryFromDocument));
	subscribe(context, vscode.commands.registerCommand('mentor.command.findReferences', commands.findReferences));
	subscribe(context, vscode.commands.registerCommand('mentor.command.implementPrefixes', commands.implementPrefixes));
	subscribe(context, vscode.commands.registerCommand('mentor.command.implementPrefixForIri', commands.implementPrefixForIri));
	subscribe(context, vscode.commands.registerCommand('mentor.command.openDocument', commands.openDocument));
	subscribe(context, vscode.commands.registerCommand('mentor.command.openFileByLanguage', commands.openFileByLanguage));
	subscribe(context, vscode.commands.registerCommand('mentor.command.openGraph', commands.openGraph));
	subscribe(context, vscode.commands.registerCommand('mentor.command.openInBrowser', commands.openInBrowser));
	subscribe(context, vscode.commands.registerCommand('mentor.command.openSettings', commands.openSettings));
	subscribe(context, vscode.commands.registerCommand('mentor.command.removeFromQueryHistory', commands.removeFromQueryHistory));
	subscribe(context, vscode.commands.registerCommand('mentor.command.removeSparqlEndpoint', commands.removeSparqlEndpoint));
	subscribe(context, vscode.commands.registerCommand('mentor.command.revealDefinition', commands.revealDefinition));
	subscribe(context, vscode.commands.registerCommand('mentor.command.revealShapeDefinition', commands.revealShapeDefinition));
	subscribe(context, vscode.commands.registerCommand('mentor.command.saveSparqlQueryResults', commands.saveSparqlQueryResults));
	subscribe(context, vscode.commands.registerCommand('mentor.command.selectActiveLanguage', commands.selectActiveLanguage));
	subscribe(context, vscode.commands.registerCommand('mentor.command.selectSparqlEndpoint', commands.selectSparqlEndpoint));
	subscribe(context, vscode.commands.registerCommand('mentor.command.sortPrefixes', commands.sortPrefixes));
	subscribe(context, vscode.commands.registerCommand('mentor.command.updatePrefixes', commands.updatePrefixes));
	subscribe(context, vscode.commands.registerCommand('mentor.webview.show', commands.showWebview));
}

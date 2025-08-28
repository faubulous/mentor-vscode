'use strict';
require('setimmediate');
import * as vscode from 'vscode';
import * as languages from './languages';
import * as commands from './commands';
import * as views from './views';
import * as webviews from './webviews';
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

function registerLanguageClients(context: vscode.ExtensionContext) {
	const clients: languages.LanguageClientBase[] = [
		new languages.TurtleLanguageClient(),
		new languages.TrigLanguageClient(),
		new languages.SparqlLanguageClient()
	];

	for (const client of clients) {
		context.subscriptions.push(client);

		client.start(context);
	}
}

function registerNotebookSerializers(context: vscode.ExtensionContext) {
	context.subscriptions.push(new NotebookController());
	context.subscriptions.push(new NotebookSerializer().register());
}

function registerProviders(context: vscode.ExtensionContext) {
	context.subscriptions.push(...new languages.XmlTokenProvider().register());
	context.subscriptions.push(...new languages.TurtleTokenProvider().register());
	context.subscriptions.push(...new languages.TrigTokenProvider().register());
	context.subscriptions.push(...new languages.SparqlTokenProvider().register());
	context.subscriptions.push(...new providers.WorkspaceUriLinkProvider().register());
	context.subscriptions.push(...new providers.WorkspaceFileSystemProvider().register());
	context.subscriptions.push(...new providers.InferenceUriLinkProvider().register());
}

function registerUriHandlers(context: vscode.ExtensionContext) {
	context.subscriptions.push(...new providers.InferenceUriHandler(context).register());
}

function registerViews(context: vscode.ExtensionContext) {
	// TODO: Dispose the view providers in the trees.
	context.subscriptions.push(new views.WorkspaceTree().treeView);
	context.subscriptions.push(new views.DefinitionTree().treeView);
	context.subscriptions.push(...webviews.sparqlResultsWebviewProvider.register(context));
}

function registerCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.analyzeWorkspace', commands.analyzeWorkspace));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.clearQueryHistory', commands.clearQueryHistory));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.createNotebook', commands.createNotebook));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.createNotebookFromEditor', commands.createNotebookFromEditor));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.createSparqlQueryFile', commands.createSparqlQueryFile));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.executeNotebookCell', commands.executeNotebookCell));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.executeSparqlQueryFromDocument', commands.executeSparqlQueryFromDocument));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.executeSparqlQueryFromActiveEditor', commands.executeSparqlQueryFromActiveEditor));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.executeSparqlQuery', commands.executeSparqlQuery));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.saveSparqlQueryResults', commands.saveSparqlQueryResults));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.deletePrefixes', commands.deletePrefixes));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.findReferences', commands.findReferences));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.implementPrefixes', commands.implementPrefixes));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.implementPrefixForIri', commands.implementPrefixForIri));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.openInBrowser', commands.openInBrowser));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.removeFromQueryHistory', commands.removeFromQueryHistory));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.revealDefinition', commands.revealDefinition));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.revealShapeDefinition', commands.revealShapeDefinition));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.selectActiveLanguage', commands.selectActiveLanguage));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.sortPrefixes', commands.sortPrefixes));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.openDocument', commands.openDocument));
	context.subscriptions.push(vscode.commands.registerCommand("mentor.action.openDocumentGraph", commands.openDocumentGraph));
	context.subscriptions.push(vscode.commands.registerCommand("mentor.action.openSettings", commands.openSettings));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.openFileByLanguage', commands.openFileByLanguage));
}

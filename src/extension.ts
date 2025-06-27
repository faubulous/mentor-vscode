'use strict';
require('setimmediate');
import * as vscode from 'vscode';
import * as languages from './languages';
import * as commands from './commands';
import * as views from './views';
import { mentor } from './mentor';
import { NotebookSerializer } from './notebook-serializer';
import { NOTEBOOK_TYPE, NotebookController } from './notebook-controller';

const clients: languages.LanguageClientBase[] = [
	new languages.TurtleLanguageClient(),
	new languages.TrigLanguageClient(),
	new languages.SparqlLanguageClient()
];

export async function activate(context: vscode.ExtensionContext) {
	registerProviders(context);
	registerCommands(context);
	registerViews(context);
	registerNotebookSerializers(context);

	for (const client of clients) {
		client.start(context);
	}

	mentor.initialize(context);
}

export async function deactivate() {
	for (const client of clients) {
		await client.dispose();
	}
}

function registerNotebookSerializers(context: vscode.ExtensionContext) {
	context.subscriptions.push(new NotebookController());
	context.subscriptions.push(vscode.workspace.registerNotebookSerializer(NOTEBOOK_TYPE, new NotebookSerializer(), { transientOutputs: true }));
}

function registerProviders(context: vscode.ExtensionContext) {
	context.subscriptions.push(...new languages.XmlTokenProvider().register());
	context.subscriptions.push(...new languages.TurtleTokenProvider().register());
	context.subscriptions.push(...new languages.TrigTokenProvider().register());
	context.subscriptions.push(...new languages.SparqlTokenProvider().register());
}

function registerViews(context: vscode.ExtensionContext) {
	// TODO: Dispose the view providers in the trees.
	context.subscriptions.push(new views.WorkspaceTree().treeView);
	context.subscriptions.push(new views.DefinitionTree().treeView);
}

function registerCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.analyzeWorkspace', commands.analyzeWorkspace));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.createNotebook', commands.createNotebook));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.createNotebookFromEditor', commands.createNotebookFromEditor));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.runSparqlQueryFromEditor', () => commands.runSparqlQueryFromEditor(context)));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.deletePrefixes', commands.deletePrefixes));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.findReferences', commands.findReferences));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.implementPrefixes', commands.implementPrefixes));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.implementPrefixForIri', commands.implementPrefixForIri));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.openInBrowser', commands.openInBrowser));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.revealDefinition', commands.revealDefinition));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.revealShapeDefinition', commands.revealShapeDefinition));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.selectActiveLanguage', commands.selectActiveLanguage));
	context.subscriptions.push(vscode.commands.registerCommand('mentor.action.sortPrefixes', commands.sortPrefixes));
	context.subscriptions.push(vscode.commands.registerCommand("mentor.action.openDocumentGraph", commands.openDocumentGraph));
	context.subscriptions.push(vscode.commands.registerCommand("mentor.action.openSettings", commands.openSettings));
}

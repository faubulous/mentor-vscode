'use strict';
import * as vscode from 'vscode';
import { mentor } from './mentor';
import { Disposable } from 'vscode-languageclient';
import { TreeView } from './views/tree-view';
import { WorkspaceTree } from './views/workspace-tree';
import { DefinitionTree } from './views/definition-tree';
import * as language from './languages';
import * as action from './commands';

const clients: language.LanguageClientBase[] = [
	new language.TurtleLanguageClient(),
	new language.TrigLanguageClient(),
	new language.SparqlLanguageClient()
];

const providers: Disposable[] = [
	...new language.XmlTokenProvider().register(),
	...new language.TurtleTokenProvider().register(),
	...new language.TrigTokenProvider().register(),
	...new language.SparqlTokenProvider().register()
];

const commands: Disposable[] = [];

const views: TreeView[] = [];

export async function activate(context: vscode.ExtensionContext) {
	registerCommands(context);

	// Register the tree views.
	views.push(new WorkspaceTree());
	views.push(new DefinitionTree());

	// Start the language clients..
	for (const client of clients) {
		client.start(context);
	}

	mentor.initialize(context);
}

export function deactivate(): Thenable<void> {
	return new Promise(async () => {
		for (const client of clients) {
			await client.dispose();
		}

		for (const provider of providers) {
			provider.dispose();
		}

		for (const command of commands) {
			command.dispose();
		}

		for (const view of views) {
			view.treeView.dispose();
		}
	});
}

function registerCommands(context: vscode.ExtensionContext) {
	commands.push(vscode.commands.registerCommand('mentor.action.analyzeWorkspace', action.analyzeWorkspace));
	commands.push(vscode.commands.registerCommand('mentor.action.createNotebookFromFile', action.createNotebookFromFile));
	commands.push(vscode.commands.registerCommand('mentor.action.deletePrefixes', action.deletePrefixes));
	commands.push(vscode.commands.registerCommand('mentor.action.findReferences', action.findReferences));
	commands.push(vscode.commands.registerCommand('mentor.action.implementPrefixes', action.implementPrefixes));
	commands.push(vscode.commands.registerCommand('mentor.action.implementPrefixForIri', action.implementPrefixForIri));
	commands.push(vscode.commands.registerCommand('mentor.action.openInBrowser', action.openInBrowser));
	commands.push(vscode.commands.registerCommand('mentor.action.revealDefinition', action.revealDefinition));
	commands.push(vscode.commands.registerCommand('mentor.action.revealShapeDefinition', action.revealShapeDefinition));
	commands.push(vscode.commands.registerCommand('mentor.action.selectActiveLanguage', action.selectActiveLanguage));
	commands.push(vscode.commands.registerCommand('mentor.action.sortPrefixes', action.sortPrefixes));
	commands.push(vscode.commands.registerCommand("mentor.action.openDocumentGraph", action.openDocumentGraph));
	commands.push(vscode.commands.registerCommand("mentor.action.openSettings", action.openSettings));
}
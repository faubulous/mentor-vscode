'use strict';
import * as vscode from 'vscode';
import * as mentor from './mentor'
import { Disposable } from 'vscode-languageclient';
import { TermTree } from './extension/term-tree';
import { ClassTree } from './extension/class-tree';
import { PropertyTree } from './extension/property-tree';
import { IndividualTree } from './extension/individual-tree';
import {
	LanguageClientBase,
	TurtleLanguageClient,
	TurtleTokenProvider,
	TrigLanguageClient,
	SparqlLanguageClient,
	SparqlTokenProvider
} from './languages';
import { DefinitionProvider } from './providers';
import { WorkspaceTree } from './extension/workspace-tree';

const clients: LanguageClientBase[] = [
	new TurtleLanguageClient(),
	new TrigLanguageClient(),
	new SparqlLanguageClient()
];

const providers: Disposable[] = [
	...new TurtleTokenProvider().register(),
	...new SparqlTokenProvider().register()
];

const disposables: Disposable[] = [];

export function activate(context: vscode.ExtensionContext) {
	// Start the language clients..
	for (const client of clients) {
		client.start(context);
	}

	registerCommands(context);

	// Register the tree views.
	disposables.push(new WorkspaceTree(context).treeView);
	disposables.push(new TermTree(context).treeView);
	disposables.push(new ClassTree(context).treeView);
	disposables.push(new PropertyTree(context).treeView);
	disposables.push(new IndividualTree(context).treeView);
}

export function deactivate(): Thenable<void> {
	return new Promise(async () => {
		for (const client of clients) {
			await client.dispose();
		}

		for (const provider of providers) {
			provider.dispose();
		}
	});
}

function registerCommands(context: vscode.ExtensionContext) {
	// Open the settings view via command
	disposables.push(vscode.commands.registerCommand("mentor.action.openSettings", () => {
		vscode.commands.executeCommand('workbench.action.openSettings', '@ext:faubulous.mentor');
	}));

	disposables.push(vscode.commands.registerCommand('mentor.action.openInBrowser', (uri: string) => {
		const internalBrowser = mentor.configuration.get('internalBrowserEnabled');

		if (internalBrowser === true) {
			vscode.commands.executeCommand('simpleBrowser.show', uri);
		} else {
			vscode.env.openExternal(vscode.Uri.parse(uri, true));
		}
	}));

	disposables.push(vscode.commands.registerCommand('mentor.action.findReferences', (id: string) => {
		mentor.activateDocument().then((editor) => {
			if (mentor.activeContext && editor) {
				const uri = id.substring(id.indexOf(':') + 1);
				const location = new DefinitionProvider().provideDefintionForUri(mentor.activeContext, uri);

				if (location instanceof vscode.Location) {
					editor.selection = new vscode.Selection(location.range.start, location.range.end);

					vscode.commands.executeCommand('references-view.findReferences', editor.document.uri, editor.selection.active);
				}
			}
		});
	}));

	disposables.push(vscode.commands.registerCommand('mentor.action.goToDefinition', (uri: string) => {
		mentor.activateDocument().then((editor) => {
			if (mentor.activeContext && editor) {
				const location = new DefinitionProvider().provideDefintionForUri(mentor.activeContext, uri);

				if (location instanceof vscode.Location) {
					editor.selection = new vscode.Selection(location.range.start, location.range.end);
					editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
				}
			}
		});
	}));
}
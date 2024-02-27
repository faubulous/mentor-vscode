'use strict';
import * as vscode from 'vscode';
import * as mentor from './mentor'
import { Disposable } from 'vscode-languageclient';
import { TreeView } from './extension/tree-view';
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

const commands: Disposable[] = [];

const views: TreeView[] = [];

export function activate(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'mentor.initializing', true);

	// Start the language clients..
	for (const client of clients) {
		client.start(context);
	}

	registerCommands(context);
	// Register the tree views.
	views.push(new WorkspaceTree(context));
	views.push(new TermTree(context));
	views.push(new ClassTree(context));
	views.push(new PropertyTree(context));
	views.push(new IndividualTree(context));

	// Make the tree view ids available for usage in package.json.
	vscode.commands.executeCommand('setContext', 'mentor.treeViews', views.map(view => view.id));

	vscode.commands.executeCommand('setContext', 'mentor.resourceTreeViews', [
		"mentor.view.combinedTree",
		"mentor.view.ontologyTree",
		"mentor.view.classTree",
		"mentor.view.propertyTree",
		"mentor.view.individualTree"
	]);

	vscode.commands.executeCommand('setContext', 'mentor.initializing', false);
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
	// Open the settings view via command
	commands.push(vscode.commands.registerCommand("mentor.action.openSettings", () => {
		vscode.commands.executeCommand('workbench.action.openSettings', '@ext:faubulous.mentor');
	}));

	commands.push(vscode.commands.registerCommand('mentor.action.openInBrowser', (uri: string) => {
		const internalBrowser = mentor.configuration.get('internalBrowserEnabled');

		if (internalBrowser === true) {
			vscode.commands.executeCommand('simpleBrowser.show', uri);
		} else {
			vscode.env.openExternal(vscode.Uri.parse(uri, true));
		}
	}));

	commands.push(vscode.commands.registerCommand('mentor.action.findReferences', (id: string) => {
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

	commands.push(vscode.commands.registerCommand('mentor.action.revealDefinition', (id: string) => {
		mentor.activateDocument().then((editor) => {
			if (mentor.activeContext && editor) {
				const uri = id.substring(id.indexOf(':') + 1);
				const location = new DefinitionProvider().provideDefintionForUri(mentor.activeContext, uri);

				if (location instanceof vscode.Location) {
					editor.selection = new vscode.Selection(location.range.start, location.range.end);
					editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
				} else {
					vscode.window.showErrorMessage('No definition found for: ' + uri);
				}
			}
		});
	}));
}
'use strict';
import * as vscode from 'vscode';
import * as mentor from './mentor'
import { Disposable } from 'vscode-languageclient';
import { TreeView } from './ui/tree-view';
import { WorkspaceTree } from './ui/workspace-tree';
import { TermTree } from './ui/term-tree';
import { ClassTree } from './ui/class-tree';
import { PropertyTree } from './ui/property-tree';
import { IndividualTree } from './ui/individual-tree';
import {
	LanguageClientBase,
	TurtleLanguageClient,
	TurtleTokenProvider,
	TrigLanguageClient,
	SparqlLanguageClient,
	SparqlTokenProvider
} from './languages';
import { DefinitionProvider } from './providers';
import { getUriFromNodeId } from './utilities';

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

export async function activate(context: vscode.ExtensionContext) {
	registerCommands(context);

	// Register the tree views.
	views.push(new WorkspaceTree());
	views.push(new TermTree());
	views.push(new ClassTree());
	views.push(new PropertyTree());
	views.push(new IndividualTree());

	// Make the tree view ids available for usage in package.json.
	vscode.commands.executeCommand('setContext', 'mentor.treeViews', views.map(view => view.id));

	vscode.commands.executeCommand('setContext', 'mentor.resourceTreeViews', [
		"mentor.view.combinedTree",
		"mentor.view.ontologyTree",
		"mentor.view.classTree",
		"mentor.view.propertyTree",
		"mentor.view.individualTree"
	]);

	// Start the language clients..
	for (const client of clients) {
		client.start(context);
	}

	mentor.initialize();
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
				const uri = getUriFromNodeId(id);
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
				const uri = getUriFromNodeId(id);
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
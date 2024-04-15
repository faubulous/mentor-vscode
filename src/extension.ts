'use strict';
import * as vscode from 'vscode';
import * as mentor from './mentor'
import { Disposable } from 'vscode-languageclient';
import { TreeView } from './views/tree-view';
import { WorkspaceTree } from './views/workspace-tree';
import { TermTree } from './views/definitions-tree';
import { ClassTree } from './views/class-tree';
import { PropertyTree } from './views/property-tree';
import { IndividualTree } from './views/individual-tree';
import { ConceptTree } from './views/concept-tree';
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
import { WorkspaceAnalyzer } from './workspace-analyzer';

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
	views.push(new ConceptTree());

	// Make the tree view ids available for usage in package.json.
	vscode.commands.executeCommand('setContext', 'mentor.treeViews', views.map(view => view.id));

	vscode.commands.executeCommand('setContext', 'mentor.resourceTreeViews', [
		"mentor.view.definitionsTree",
		"mentor.view.ontologyTree",
		"mentor.view.classTree",
		"mentor.view.propertyTree",
		"mentor.view.individualTree",
		"mentor.view.conceptTree"
	]);

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
				const location = new DefinitionProvider().provideDefintionForUri(mentor.activeContext, uri, true);

				if (location instanceof vscode.Location) {
					editor.selection = new vscode.Selection(location.range.start, location.range.end);
					editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
				} else {
					vscode.window.showErrorMessage('No definition found for: ' + uri);
				}
			}
		});
	}));

	commands.push(vscode.commands.registerCommand('mentor.action.analyzeWorkspace', async () => {
		await new WorkspaceAnalyzer().analyzeWorkspace();
	}));
}
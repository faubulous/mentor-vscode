'use strict';
import * as vscode from 'vscode';
import { Disposable } from 'vscode-languageclient';
import { ClassTree } from './extension/class-tree';
import { PropertyTree } from './extension/property-tree';
import { IndividualTree } from './extension/individual-tree';
import { SettingsPanel } from "./extension/panels/SettingsPanel";
import { SettingsViewProvider } from "./extension/panels/SettingsViewProvider";
import { mentor } from './mentor'
import {
	LanguageClientBase,
	TurtleLanguageClient,
	TurtleTokenProvider,
	TrigLanguageClient,
	SparqlLanguageClient,
	SparqlTokenProvider
} from './languages';
import { DefinitionProvider } from './providers';

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
	// Open the settings view as a webview; will use this for the tree view once React components are implemented.
	disposables.push(vscode.window.registerWebviewViewProvider(SettingsViewProvider.viewType, new SettingsViewProvider(context.extensionUri)));

	// Start the language clients..
	for (const client of clients) {
		client.start(context);
	}

	registerCommands(context);

	new ClassTree(context);
	new PropertyTree(context);
	new IndividualTree(context);
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
	disposables.push(vscode.commands.registerCommand("mentor.command.openSettings", () => {
		SettingsPanel.render(context.extensionUri);
	}));

	disposables.push(vscode.commands.registerCommand('mentor.command.openInBrowser', (uri: string) => {
		const internalBrowser = vscode.workspace.getConfiguration('mentor').get('internalBrowserEnabled');

		if (internalBrowser === true) {
			vscode.commands.executeCommand('simpleBrowser.show', uri);
		} else {
			vscode.env.openExternal(vscode.Uri.parse(uri));
		}
	}));

	disposables.push(vscode.commands.registerCommand('mentor.command.goToDefinition', (uri: string) => {
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

	disposables.push(vscode.commands.registerCommand('mentor.command.showUsages', (uri: string) => {
		mentor.filterByClass(uri);
	}));
}
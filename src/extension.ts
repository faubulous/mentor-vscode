'use strict';
import { ExtensionContext, commands, Uri, env, workspace, window } from 'vscode';
import { ClassTree } from './extension/class-tree';
import { PropertyTree } from './extension/property-tree';
import { IndividualTree } from './extension/individual-tree';
import { SettingsPanel } from "./extension/panels/SettingsPanel";
import { SettingsViewProvider } from "./extension/panels/SettingsViewProvider";
import {
	LanguageClientBase,
	TurtleLanguageClient,
	TurtleTokenProvider,
	TrigLanguageClient,
	SparqlLanguageClient,
	SparqlTokenProvider
} from './languages';
import { Disposable } from 'vscode-languageclient';

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

export function activate(context: ExtensionContext) {
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

function registerCommands(context: ExtensionContext) {
	disposables.push(commands.registerCommand('mentor.command.openInBrowser', (uri: string) => {
		const internalBrowser = workspace.getConfiguration('mentor').get('internalBrowserEnabled');

		if (internalBrowser === true) {
			commands.executeCommand('simpleBrowser.show', uri);
		} else {
			env.openExternal(Uri.parse(uri));
		}
	}));

	// Open the settings view as a webview; will use this for the tree view once React components are implemented.
	disposables.push(window.registerWebviewViewProvider(SettingsViewProvider.viewType, new SettingsViewProvider(context.extensionUri)));

	// Open the settings view via command
	disposables.push(commands.registerCommand("mentor.command.openSettings", () => {
		SettingsPanel.render(context.extensionUri);
	}));
}
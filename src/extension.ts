'use strict';
import { ExtensionContext } from 'vscode';
import { ResourceModule } from './extension/resource-module';
import { ClassModule } from './extension/class-module';
import { PropertyModule } from './extension/property-module';
import { IndividualModule } from './extension/individual-module';
import { SettingsModule } from './extension/settings-module';
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

export function activate(context: ExtensionContext) {
	// Start the language clients..
	for (const client of clients) {
		client.start(context);
	}

	// Then activate the user interface components..
	SettingsModule.activate(context);
	ResourceModule.activate(context);
	ClassModule.activate(context);
	PropertyModule.activate(context);
	IndividualModule.activate(context);
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
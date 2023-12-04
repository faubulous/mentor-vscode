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

let providers: Disposable[] = [];

export function activate(context: ExtensionContext) {
	SettingsModule.activate(context);
	ResourceModule.activate(context);
	ClassModule.activate(context);
	PropertyModule.activate(context);
	IndividualModule.activate(context);

	providers = [
		...TurtleTokenProvider.activate(context),
		...SparqlTokenProvider.activate(context)
	];

	for (const client of clients) {
		client.start(context);
	}
}

export function deactivate(): Thenable<void> {
	const promises: Thenable<void>[] = [];

	for (const client of clients) {
		promises.push(client.stop());
	}

	for (const provider of providers) {
		provider.dispose();
	}

	return Promise.all(promises).then(() => undefined);
}
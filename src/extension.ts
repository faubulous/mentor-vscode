'use strict';
import { ExtensionContext } from 'vscode';
import { ResourceModule } from './extension/resource-module';
import { ClassModule } from './extension/class-module';
import { PropertyModule } from './extension/property-module';
import { IndividualModule } from './extension/individual-module';
import { SettingsModule } from './extension/settings-module';
import * as TurtleTokenProvider from './languages/token-provider-turtle';
import {
	LanguageClientBase,
	TurtleLanguageClient,
	TrigLanguageClient,
	SparqlLanguageClient
} from './languages';

const clients: LanguageClientBase[] = [
	new TurtleLanguageClient(),
	new TrigLanguageClient(),
	new SparqlLanguageClient()
];

export function activate(context: ExtensionContext) {
	SettingsModule.activate(context);
	ResourceModule.activate(context);
	ClassModule.activate(context);
	PropertyModule.activate(context);
	IndividualModule.activate(context);
	TurtleTokenProvider.activate(context);

	for (const client of clients) {
		client.start(context);
	}
}

export function deactivate(): Thenable<void> {
	const promises: Thenable<void>[] = [];

	for (const client of clients) {
		promises.push(client.stop());
	}

	return Promise.all(promises).then(() => undefined);
}
'use strict';
import { ExtensionContext } from 'vscode';
import { ResourceModule } from './extension/resource-module';
import { ClassModule } from './extension/class-module';
import { PropertyModule } from './extension/property-module';
import { IndividualModule } from './extension/individual-module';
import { SettingsModule } from './extension/settings-module';
import * as TurtleModule from './language-turtle/client';
import * as TurtleTokenProvider from './language-turtle/token-provider';

export function activate(context: ExtensionContext) {
	SettingsModule.activate(context);
	ResourceModule.activate(context);
	ClassModule.activate(context);
	PropertyModule.activate(context);
	IndividualModule.activate(context);
	TurtleModule.activate(context);
	TurtleTokenProvider.activate(context);
}

export function deactivate(): Thenable<void> {
	return TurtleModule.deactivate();
}
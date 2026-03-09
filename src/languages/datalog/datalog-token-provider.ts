import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { DatalogRenameProvider } from '@src/providers/datalog';

const renameProvider = new DatalogRenameProvider();

/**
 * Token provider for Datalog language features.
 */
export class DatalogTokenProvider {
	constructor() {
		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(
			vscode.languages.registerRenameProvider({ language: 'datalog' }, renameProvider),
		);
	}
}

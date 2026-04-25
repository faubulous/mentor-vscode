import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ResourceReferenceProvider, ResourceTooltipProvider } from '@src/providers';
import { TurtleUsageCodeLensProvider } from '@src/languages/turtle/providers';
import { XmlRenameProvider } from '@src/languages/xml/providers';

const codelensProvider = new TurtleUsageCodeLensProvider();
const hoverProvider = new ResourceTooltipProvider();
const referenceProvider = new ResourceReferenceProvider();
const renameProvider = new XmlRenameProvider();

export class XmlTokenProvider {
	constructor() {
		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(...this.registerForLanguage('xml'));
	}

	protected registerForLanguage(language: string): vscode.Disposable[] {
		return [
			vscode.languages.registerCodeLensProvider({ language }, codelensProvider),
			vscode.languages.registerHoverProvider({ language }, hoverProvider),
			vscode.languages.registerReferenceProvider({ language }, referenceProvider),
			vscode.languages.registerRenameProvider({ language }, renameProvider)
		];
	}
}
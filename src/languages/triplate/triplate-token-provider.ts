import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { TRIPLATE_LANGUAGE_IDS } from "@src/services/document/document-languages";
import { TriplateCodeLensProvider } from "./providers/triplate-code-lens-provider";
import { TriplateHoverProvider } from "./providers/triplate-hover-provider";
import { TriplateDiagnosticProvider } from './providers/triplate-diagnostic-provider';
import { ServiceToken } from '@src/services/tokens';

export class TriplateTokenProvider {
	constructor() {
		const hoverProvider = new TriplateHoverProvider();
		const codeLensProvider = new TriplateCodeLensProvider();
		const selectors = Array.from(TRIPLATE_LANGUAGE_IDS).map(language => ({ language }));

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(
			vscode.languages.registerHoverProvider(selectors, hoverProvider),
			vscode.languages.registerCodeLensProvider(selectors, codeLensProvider),
			new TriplateDiagnosticProvider()
		);
	}
}
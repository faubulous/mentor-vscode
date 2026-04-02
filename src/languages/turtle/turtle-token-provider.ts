import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import {
	ResourceReferenceProvider,
	ResourceDefinitionProvider,
	ResourceTooltipProvider
} from '@src/providers';
import {
	TurtleAutoDefinePrefixProvider,
	TurtleCodeActionsProvider,
	TurtleCodeLensProvider,
	TurtleCompletionItemProvider,
	TurtlePrefixCompletionProvider,
	TurtleRenameProvider,
	TurtleCodeFormattingProvider
} from '@src/languages/turtle/providers';

const codeActionsProvider = new TurtleCodeActionsProvider();
const codelensProvider = new TurtleCodeLensProvider();
const completionProvider = new TurtleCompletionItemProvider();
const definitionProvider = new ResourceDefinitionProvider();
const hoverProvider = new ResourceTooltipProvider();
const prefixCompletionProvider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}> .`);
const referenceProvider = new ResourceReferenceProvider();
const renameProvider = new TurtleRenameProvider();
const formattingProvider = new TurtleCodeFormattingProvider();

export class TurtleTokenProvider {
	constructor() {
		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);

		const autoDefinePrefixProvider = new TurtleAutoDefinePrefixProvider(this.getLanguages());
		context.subscriptions.push(autoDefinePrefixProvider);

		for (const language of this.getLanguages()) {
			context.subscriptions.push(...this.registerForLanguage(language));
		}
	}

	/**
	 * Returns the languages this provider should register for.
	 * Override in subclasses to register for different languages.
	 */
	protected getLanguages(): string[] {
		return ['ntriples', 'nquads', 'turtle', 'n3'];
	}

	protected registerForLanguage(language: string): vscode.Disposable[] {
		return [
			vscode.languages.registerCodeActionsProvider({ language }, codeActionsProvider),
			vscode.languages.registerCodeLensProvider({ language }, codelensProvider),
			vscode.languages.registerCompletionItemProvider({ language }, completionProvider, ':'),
			vscode.languages.registerDefinitionProvider({ language }, definitionProvider),
			vscode.languages.registerHoverProvider({ language }, hoverProvider),
			vscode.languages.registerDocumentFormattingEditProvider({ language }, formattingProvider),
			vscode.languages.registerInlineCompletionItemProvider({ language }, prefixCompletionProvider),
			vscode.languages.registerReferenceProvider({ language }, referenceProvider),
			vscode.languages.registerRenameProvider({ language }, renameProvider),
		]
	}
}
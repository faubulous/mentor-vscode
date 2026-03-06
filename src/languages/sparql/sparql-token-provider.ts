import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import {
	ReferenceProvider,
	DefinitionProvider,
	HoverProvider
} from '@src/providers';
import {
	TurtleCodeActionsProvider,
	TurtlePrefixCompletionProvider,
	TurtleRenameProvider
} from '@src/languages/turtle/providers';
import {
	SparqlCodeLensProvider,
	SparqlCompletionItemProvider
} from '@src/languages/sparql/providers';

export class SparqlTokenProvider {
	constructor() {
		const codeActionsProvider = new TurtleCodeActionsProvider();
		const codeLensProvider = new SparqlCodeLensProvider();
		const completionProvider = new SparqlCompletionItemProvider();
		const definitionProvider = new DefinitionProvider();
		const hoverProvider = new HoverProvider();
		const prefixCompletionProvider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}>`);
		const referenceProvider = new ReferenceProvider();
		const renameProvider = new TurtleRenameProvider();

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(
			vscode.languages.registerCodeActionsProvider({ language: 'sparql' }, codeActionsProvider),
			vscode.languages.registerCodeLensProvider({ language: 'sparql' }, codeLensProvider),
			vscode.languages.registerCompletionItemProvider({ language: 'sparql' }, completionProvider, ':'),
			vscode.languages.registerDefinitionProvider({ language: 'sparql' }, definitionProvider),
			vscode.languages.registerHoverProvider({ language: 'sparql' }, hoverProvider),
			vscode.languages.registerInlineCompletionItemProvider({ language: 'sparql' }, prefixCompletionProvider),
			vscode.languages.registerReferenceProvider({ language: 'sparql' }, referenceProvider),
			vscode.languages.registerRenameProvider({ language: 'sparql' }, renameProvider),
		);
	}
}
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import {
	ResourceReferenceProvider,
	ResourceDefinitionProvider,
	ResourceTooltipProvider
} from '@src/providers';
import {
	TurtleCodeActionsProvider,
	TurtlePrefixCompletionProvider,
	TurtleRenameProvider
} from '@src/providers/turtle';
import {
	SparqlCodeLensProvider,
	SparqlCompletionItemProvider
} from '@src/providers/sparql';

export class SparqlTokenProvider {
	constructor() {
		const codeActionsProvider = new TurtleCodeActionsProvider();
		const codeLensProvider = new SparqlCodeLensProvider();
		const completionProvider = new SparqlCompletionItemProvider();
		const definitionProvider = new ResourceDefinitionProvider();
		const hoverProvider = new ResourceTooltipProvider();
		const prefixCompletionProvider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}>`);
		const referenceProvider = new ResourceReferenceProvider();
		const renameProvider = new TurtleRenameProvider();

		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(
			vscode.languages.registerCodeActionsProvider({ language: 'sparql' }, codeActionsProvider),
			vscode.languages.registerCodeLensProvider({ language: 'sparql' }, codeLensProvider),
			vscode.languages.registerCompletionItemProvider({ language: 'sparql' }, completionProvider, ':', '<'),
			vscode.languages.registerDefinitionProvider({ language: 'sparql' }, definitionProvider),
			vscode.languages.registerHoverProvider({ language: 'sparql' }, hoverProvider),
			vscode.languages.registerInlineCompletionItemProvider({ language: 'sparql' }, prefixCompletionProvider),
			vscode.languages.registerReferenceProvider({ language: 'sparql' }, referenceProvider),
			vscode.languages.registerRenameProvider({ language: 'sparql' }, renameProvider),
		);
	}
}
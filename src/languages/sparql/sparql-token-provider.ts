import * as vscode from 'vscode';
import {
	ReferenceProvider,
	DefinitionProvider,
	HoverProvider
} from '@/providers';
import {
	TurtleCodeActionsProvider,
	TurtleCompletionItemProvider,
	TurtlePrefixCompletionProvider,
	TurtleRenameProvider
} from '@/languages/turtle/providers';

const definitionProvider = new DefinitionProvider();
const referenceProvider = new ReferenceProvider();
const renameProvider = new TurtleRenameProvider();
const hoverProvider = new HoverProvider();
const completionProvider = new TurtleCompletionItemProvider();
const codeActionsProvider = new TurtleCodeActionsProvider();
const prefixCompletionProvider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}>`);

export class SparqlTokenProvider {
	register(): vscode.Disposable[] {
		return [
			vscode.languages.registerRenameProvider({ language: 'sparql' }, renameProvider),
			vscode.languages.registerReferenceProvider({ language: 'sparql' }, referenceProvider),
			vscode.languages.registerDefinitionProvider({ language: 'sparql' }, definitionProvider),
			vscode.languages.registerHoverProvider({ language: 'sparql' }, hoverProvider),
			vscode.languages.registerCompletionItemProvider({ language: 'sparql' }, completionProvider, ':'),
			vscode.languages.registerCodeActionsProvider({ language: 'sparql' }, codeActionsProvider),
			vscode.languages.registerInlineCompletionItemProvider({ language: 'sparql' }, prefixCompletionProvider)
		];
	}
}
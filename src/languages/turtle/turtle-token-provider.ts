import * as vscode from 'vscode';
import {
	ReferenceProvider,
	DefinitionProvider,
	HoverProvider
} from '@src/providers';
import {
	TurtleCodeActionsProvider,
	TurtleCodeLensProvider,
	TurtleCompletionItemProvider,
	TurtlePrefixCompletionProvider,
	TurtleRenameProvider
} from '@src/languages/turtle/providers';

const codeActionsProvider = new TurtleCodeActionsProvider();
const codelensProvider = new TurtleCodeLensProvider();
const completionProvider = new TurtleCompletionItemProvider();
const definitionProvider = new DefinitionProvider();
const hoverProvider = new HoverProvider();
const prefixCompletionProvider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}> .`);
const referenceProvider = new ReferenceProvider();
const renameProvider = new TurtleRenameProvider();

export class TurtleTokenProvider {
	register(): vscode.Disposable[] {
		return [
			...this.registerForLanguage('ntriples'),
			...this.registerForLanguage('nquads'),
			...this.registerForLanguage('turtle')
		];
	}

	registerForLanguage(language: string): vscode.Disposable[] {
		return [
			vscode.languages.registerCodeActionsProvider({ language }, codeActionsProvider),
			vscode.languages.registerCodeLensProvider({ language }, codelensProvider),
			vscode.languages.registerCompletionItemProvider({ language }, completionProvider, ':'),
			vscode.languages.registerDefinitionProvider({ language }, definitionProvider),
			vscode.languages.registerHoverProvider({ language }, hoverProvider),
			vscode.languages.registerInlineCompletionItemProvider({ language }, prefixCompletionProvider),
			vscode.languages.registerReferenceProvider({ language }, referenceProvider),
			vscode.languages.registerRenameProvider({ language }, renameProvider),
		]
	}
}
import * as vscode from 'vscode';
import {
	CodeLensProvider,
	ReferenceProvider,
	DefinitionProvider
} from '@/providers';
import {
	SemanticTokensLegend,
	TurtleRenameProvider,
	HoverProvider,
	TurtleSemanticTokensProvider,
	TurtleCompletionItemProvider,
	TurtleCodeActionsProvider,
	TurtlePrefixCompletionProvider
} from '@/languages/turtle/providers';

const codelensProvider = new CodeLensProvider();
const definitionProvider = new DefinitionProvider();
const hoverProvider = new HoverProvider();
const referenceProvider = new ReferenceProvider();
const tokenProvider = new TurtleSemanticTokensProvider();
const renameProvider = new TurtleRenameProvider();
const completionProvider = new TurtleCompletionItemProvider();
const codeActionsProvider = new TurtleCodeActionsProvider();
const prefixCompletionProvider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}> .`);

export class TurtleTokenProvider {
	register(): vscode.Disposable[] {
		return [
			...this.registerForLanguage('ntriples'),
			...this.registerForLanguage('nquads'),
			...this.registerForLanguage('turtle')
		];
	}

	registerForLanguage(language: string): vscode.Disposable[] {
		const result = [];

		result.push(vscode.languages.registerDocumentSemanticTokensProvider({ language }, tokenProvider, SemanticTokensLegend));
		result.push(vscode.languages.registerRenameProvider({ language }, renameProvider));
		result.push(vscode.languages.registerDefinitionProvider({ language }, definitionProvider));
		result.push(vscode.languages.registerHoverProvider({ language }, hoverProvider));
		result.push(vscode.languages.registerReferenceProvider({ language }, referenceProvider));
		result.push(vscode.languages.registerCompletionItemProvider({ language }, completionProvider, ':'));
		result.push(vscode.languages.registerCodeLensProvider({ language }, codelensProvider));
		result.push(vscode.languages.registerCodeActionsProvider({ language }, codeActionsProvider));
		result.push(vscode.languages.registerInlineCompletionItemProvider({ language }, prefixCompletionProvider));

		return result;
	}
}
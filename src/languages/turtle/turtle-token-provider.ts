import * as vscode from 'vscode';
import {
	RenameProvider,
	DefinitionProvider,
	ReferenceProvider,
	HoverProvider,
	SemanticTokensProvider,
	SemanticTokensLegend,
	CompletionItemProvider,
	CodeLensProvider,
	CodeActionsProvider,
	PrefixCompletionProvider
} from '@/languages/turtle/providers';

const tokenProvider = new SemanticTokensProvider();
const renameProvider = new RenameProvider();
const referenceProvider = new ReferenceProvider();
const definitionProvider = new DefinitionProvider();
const hoverProvider = new HoverProvider();
const completionProvider = new CompletionItemProvider();
const codelensProvider = new CodeLensProvider();
const codeActionsProvider = new CodeActionsProvider();
const prefixCompletionProvider = new PrefixCompletionProvider((uri) => ` <${uri}> .`);

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
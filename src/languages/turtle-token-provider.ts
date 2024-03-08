import * as vscode from 'vscode';
import {
	RenameProvider,
	DefinitionProvider,
	ReferenceProvider,
	HoverProvider,
	SemanticTokensProvider,
	SemanticTokensLegend,
	CompletionItemProvider,
	CodeLensProvider
} from '../providers';

const tokenProvider = new SemanticTokensProvider();
const renameProvider = new RenameProvider();
const referenceProvider = new ReferenceProvider();
const definitionProvider = new DefinitionProvider();
const hoverProvider = new HoverProvider();
const completionProvider = new CompletionItemProvider();
const codelensProvider = new CodeLensProvider();

export class TurtleTokenProvider {
	register(): vscode.Disposable[] {
		const result = [];
		const languages = ['turtle', 'trig', 'ntriples', 'nquads'];

		for (const language of languages) {
			result.push(vscode.languages.registerDocumentSemanticTokensProvider({ language }, tokenProvider, SemanticTokensLegend));
			result.push(vscode.languages.registerRenameProvider({ language }, renameProvider));
			result.push(vscode.languages.registerDefinitionProvider({ language }, definitionProvider));
			result.push(vscode.languages.registerHoverProvider({ language }, hoverProvider));
			result.push(vscode.languages.registerReferenceProvider({ language }, referenceProvider));
			result.push(vscode.languages.registerCompletionItemProvider({ language }, completionProvider, ':'));
			result.push(vscode.languages.registerCodeLensProvider({ language }, codelensProvider));
		}

		return result;
	}
}
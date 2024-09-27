import * as vscode from 'vscode';
import { mentor } from '../mentor';
import {
	RenameProvider,
	DefinitionProvider,
	ReferenceProvider,
	HoverProvider,
	SemanticTokensProvider,
	SemanticTokensLegend,
	CompletionItemProvider,
	CodeLensProvider,
	CodeActionsProvider
} from '../providers';
import { PrefixCompletionProvider } from '../providers/prefix-completion-provider';

const tokenProvider = new SemanticTokensProvider();
const renameProvider = new RenameProvider();
const referenceProvider = new ReferenceProvider();
const definitionProvider = new DefinitionProvider();
const hoverProvider = new HoverProvider();
const completionProvider = new CompletionItemProvider();
const codelensProvider = new CodeLensProvider();
const codeActionsProvider = new CodeActionsProvider({
	fixMissingPrefixes: 'mentor.action.turtle.fixMissingPrefixes'
});
const prefixCompletionProvider = new PrefixCompletionProvider((uri) => ` <${uri}> .`);

export class TurtleTokenProvider {
	register(): vscode.Disposable[] {
		this.registerCommands();

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
			result.push(vscode.languages.registerCodeActionsProvider({ language }, codeActionsProvider));
			result.push(vscode.languages.registerInlineCompletionItemProvider({ language }, prefixCompletionProvider));
		}

		return result;
	}

	registerCommands() {
		vscode.commands.registerCommand(codeActionsProvider.commands.fixMissingPrefixes, (documentUri, prefixes) => {
			mentor.prefixDeclarationService.fixMissingPrefixes(documentUri, prefixes, 'TTL_PREFIX', (prefix, uri) => {
				// All prefixes keywords are always in lowercase in Turtle.
				return `@prefix ${prefix}: <${uri}> .\n`;
			});
		});
	}
}
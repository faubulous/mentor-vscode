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
import { SparqlCodeLensProvider } from '@/languages/sparql/providers';

const codeActionsProvider = new TurtleCodeActionsProvider();
const codeLensProvider = new SparqlCodeLensProvider();
const completionProvider = new TurtleCompletionItemProvider();
const definitionProvider = new DefinitionProvider();
const hoverProvider = new HoverProvider();
const prefixCompletionProvider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}>`);
const referenceProvider = new ReferenceProvider();
const renameProvider = new TurtleRenameProvider();

export class SparqlTokenProvider {
	register(): vscode.Disposable[] {
		return [
			vscode.languages.registerCodeActionsProvider({ language: 'sparql' }, codeActionsProvider),
			vscode.languages.registerCodeLensProvider({ language: 'sparql' }, codeLensProvider),
			vscode.languages.registerCompletionItemProvider({ language: 'sparql' }, completionProvider, ':'),
			vscode.languages.registerDefinitionProvider({ language: 'sparql' }, definitionProvider),
			vscode.languages.registerHoverProvider({ language: 'sparql' }, hoverProvider),
			vscode.languages.registerInlineCompletionItemProvider({ language: 'sparql' }, prefixCompletionProvider),
			vscode.languages.registerReferenceProvider({ language: 'sparql' }, referenceProvider),
			vscode.languages.registerRenameProvider({ language: 'sparql' }, renameProvider),
		];
	}
}
import * as vscode from 'vscode';
import * as mentor from '../mentor';
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
import { TurtleActionsProvider } from './turtle-actions-provider';
import { PrefixLookupService } from '../services/prefix-lookup-service';
import { getLastTokenOfType } from '../utilities';

const tokenProvider = new SemanticTokensProvider();
const renameProvider = new RenameProvider();
const referenceProvider = new ReferenceProvider();
const definitionProvider = new DefinitionProvider();
const hoverProvider = new HoverProvider();
const completionProvider = new CompletionItemProvider();
const codelensProvider = new CodeLensProvider();
const codeactionsProvider = new TurtleActionsProvider();

export class TurtleTokenProvider {
	private readonly _prefixLookupService = new PrefixLookupService();

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
			result.push(vscode.languages.registerCodeActionsProvider({ language }, codeactionsProvider));
		}

		return result;
	}

	// TODO:
	// - Implement syntax casing detection to properly handle the case of the prefix.
	// - Implement a command to fix all missing prefixes.
	registerCommands() {
		vscode.commands.registerCommand('mentor.action.fixMissingPrefix.turtle', (documentUri, prefix) => {
			const document = mentor.contexts[documentUri];

			if (document) {
				const uri = this._prefixLookupService.getUriForPrefix(prefix);

				// Insert the new prefix declaration after the last prefix declaration in the document.
				const token = getLastTokenOfType(document.tokens, 'PREFIX');
				const line = token ? (token.endLine ?? 0) : 0;

				const edit = new vscode.WorkspaceEdit();
				edit.insert(documentUri, new vscode.Position(line, 0), `prefix ${prefix}: <${uri}> .\n`);

				vscode.workspace.applyEdit(edit);
			}
		});
	}
}
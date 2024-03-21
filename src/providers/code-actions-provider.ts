import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { PrefixLookupService } from '../services/prefix-lookup-service';
import { FeatureProvider } from './feature-provider';
import { getLastTokenOfType, getNextToken } from '../utilities';

/**
 * The commands that are supported by the code actions provider.
 */
export interface CodeActionProviderCommands {
	/**
	 * The command to be used for fixing missing prefixes.
	 */
	fixMissingPrefixes: string;
}

/**
 * A provider for RDF document code actions.
 */
export class CodeActionsProvider extends FeatureProvider implements vscode.CodeActionProvider {
	/**
	 * The service to be used for looking up project specific or commonly used prefixes.
	 */
	protected readonly prefixLookupService = new PrefixLookupService();

	/**
	 * The commands to be used for implementing common code actions.
	 */
	public readonly commands: CodeActionProviderCommands;

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	constructor(commands: CodeActionProviderCommands) {
		super();

		this.commands = commands;
	}

	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range, actionContext: vscode.CodeActionContext): Promise<vscode.CodeAction[]> {
		// Wait until the workspace has been indexed to have access to all prefix definitions.
		await mentor.indexer.waitForIndexed();

		const prefixes = this._getMissingPrefixes(document, actionContext.diagnostics);

		return this.provideFixMissingPrefixesActions(document, prefixes);
	}

	/**
	 * Get a code action for defining a missing prefixes.
	 * @param document An RDF document context.
	 * @param prefixes The prefixes to define.
	 * @returns Code actions for defining missing prefixes.
	 */
	provideFixMissingPrefixesActions(document: vscode.TextDocument, prefixes: string[]): vscode.CodeAction[] {
		const result = [];

		// Fixing missing prefixes is implemented as a command instead of a satic edit because 
		// the document may change in the meantime and the insert range may no longer be valid.
		if (prefixes.length > 0) {
			const missingPrefixes = this._getMissingPrefixes(document, vscode.languages.getDiagnostics(document.uri));

			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: 'Implement all missing prefixes',
				isPreferred: true,
				command: {
					title: 'Implement all missing prefixes',
					command: this.commands.fixMissingPrefixes,
					arguments: [document.uri, missingPrefixes]
				}
			});

			for (let prefix of prefixes) {
				result.push({
					kind: vscode.CodeActionKind.QuickFix,
					title: `Implement missing prefix: ${prefix}`,
					isPreferred: false,
					command: {
						title: `Implement missing prefix: ${prefix}`,
						command: this.commands.fixMissingPrefixes,
						arguments: [document.uri, [prefix]]
					}
				});
			}
		}

		return result;
	}

	/**
	 * Get the missing prefixes from a list of diagnostics.
	 * @param document A text document.
	 * @param diagnostics A list of diagnostics to get the missing prefixes from.
	 * @returns An array of missing prefix definitions.
	 */
	private _getMissingPrefixes(document: vscode.TextDocument, diagnostics: Iterable<vscode.Diagnostic>): string[] {
		const result = new Set<string>();

		for (let diagnostic of diagnostics) {
			if (diagnostic.code === 'NoNamespacePrefixError') {
				const prefix = document.getText(diagnostic.range).split(':')[0];

				if (prefix) {
					result.add(prefix);
				}
			}
		}

		return Array.from(result);
	}

	/**
	 * Implement missing prefixes in a document.
	 * @param documentUri The URI of the document to fix the prefixes in.
	 * @param prefixes The prefixes to implement.
	 * @param tokenType The token type of the prefix token.
	 * @param defineCallback A callback that provides the prefix declaration.
	 */
	fixMissingPrefixes(documentUri: string, prefixes: string[], tokenType: string, defineCallback: (prefix: string, uri: string) => string) {
		const document = mentor.contexts[documentUri];

		if (document) {
			const edit = new vscode.WorkspaceEdit();

			// Implement the prefixes in a sorted order.
			const sortedPrefixes = prefixes.sort();

			// Insert the new prefix declaration after the last prefix declaration in the document.
			const lastPrefix = getLastTokenOfType(document.tokens, tokenType);

			// The line number where to insert the new prefix declaration.
			let n = lastPrefix ? (lastPrefix.endLine ?? 0) : 0;

			for (let i = 0; i < sortedPrefixes.length; i++) {
				const prefix = sortedPrefixes[i];
				const uri = this.prefixLookupService.getUriForPrefix(prefix);

				edit.insert(document.uri, new vscode.Position(n, 0), defineCallback(prefix, uri));
			}

			if (lastPrefix) {
				const nextToken = getNextToken(document.tokens, lastPrefix);

				// Insert a new line between the last prefix declaration and the next token.
				if (nextToken && nextToken.endLine === n + 1) {
					edit.insert(document.uri, new vscode.Position(n, 0), '\n');
				}
			} else {
				const firstToken = document.tokens[0];

				// Insert a new line at the beginning of the document.
				if (firstToken && firstToken.endLine == 1) {
					edit.insert(document.uri, new vscode.Position(n, 0), '\n');
				}
			}

			vscode.workspace.applyEdit(edit);
		}
	}
}
import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { FeatureProvider } from './feature-provider';

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

		const prefixes = mentor.prefixDeclarationService.getMissingPrefixes(document, vscode.languages.getDiagnostics(document.uri));

		// The service may be suspended after an Undo event.
		if (mentor.prefixDeclarationService.enabled && !mentor.prefixDeclarationService.suspended) {
			vscode.commands.executeCommand(this.commands.fixMissingPrefixes, document.uri, prefixes);
		}

		return this.provideFixMissingPrefixesActions(document, prefixes);
	}

	/**
	 * Get a code action for defining a missing prefixes.
	 * @param document An RDF document context.
	 * @param prefixes The prefixes to define.
	 * @returns Code actions for defining missing prefixes.
	 */
	provideFixMissingPrefixesActions(document: vscode.TextDocument, prefixes: string[]): vscode.CodeAction[] {
		const result: vscode.CodeAction[] = [];

		// Fixing missing prefixes is implemented as a command instead of a static edit because 
		// the document may change in the meantime and the insert range may no longer be valid.
		if (prefixes.length > 0) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: 'Implement all missing prefixes',
				isPreferred: true,
				command: {
					title: 'Implement all missing prefixes',
					command: this.commands.fixMissingPrefixes,
					arguments: [document.uri, prefixes]
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
}
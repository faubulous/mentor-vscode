import * as vscode from 'vscode';
import { FeatureProvider } from './feature-provider';

/**
 * A provider for RDF document code actions.
 */
export class CodeActionsProvider extends FeatureProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range, actionContext: vscode.CodeActionContext): Promise<vscode.CodeAction[]> {
		return this.provideFixMissingPrefixesActions(document);
	}

	/**
	 * Get a code action for defining a missing prefixes.
	 * @param document An RDF document context.
	 * @param prefixes The prefixes to define.
	 * @returns Code actions for defining missing prefixes.
	 */
	provideFixMissingPrefixesActions(document: vscode.TextDocument): vscode.CodeAction[] {
		const prefixes = new Set<string>();

		for (let diagnostic of vscode.languages.getDiagnostics(document.uri)) {
			if (diagnostic.code === 'NoNamespacePrefixError') {
				const prefix = document.getText(diagnostic.range).split(':')[0];

				// Check for undefined includes the empty prefix '' in the result.
				if (prefix !== undefined) {
					prefixes.add(prefix);
				}
			}
		}

		if (prefixes.size === 0) {
			return [];
		}

		const command = 'mentor.action.fixMissingPrefixes';

		// Fixing missing prefixes is implemented as a command instead of a static edit because 
		// the document may change in the meantime and the insert range may no longer be valid.
		const result: vscode.CodeAction[] = [{
			kind: vscode.CodeActionKind.QuickFix,
			title: 'Implement all missing prefixes',
			isPreferred: true,
			command: {
				title: 'Implement all missing prefixes',
				command: command,
				arguments: [document.uri, Array.from(prefixes)]
			}
		}];

		for (let prefix of prefixes) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: `Implement missing prefix: ${prefix}`,
				isPreferred: false,
				command: {
					title: `Implement missing prefix: ${prefix}`,
					command: command,
					arguments: [document.uri, [prefix]]
				}
			});
		}

		return result;
	}
}
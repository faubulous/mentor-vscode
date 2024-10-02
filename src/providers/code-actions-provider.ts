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
		const undefinedPrefixes = new Set<string>();
		const unusedPrefixes = new Set<string>();

		for (let diagnostic of vscode.languages.getDiagnostics(document.uri)) {
			if (diagnostic.code === 'NoNamespacePrefixError') {
				const prefix = document.getText(diagnostic.range).split(':')[0];

				// Check for undefined includes the empty prefix '' in the result.
				if (prefix !== undefined) {
					undefinedPrefixes.add(prefix);
				}
			} else if (diagnostic.code === 'UnusedNamespacePrefixHint') {
				const prefix = document.getText(diagnostic.range).split(':')[0];

				if (prefix !== undefined) {
					unusedPrefixes.add(prefix);
				}
			}
		}

		const result: vscode.CodeAction[] = [];

		if (undefinedPrefixes.size > 0) {
			// Fixing missing prefixes is implemented as a command instead of a static edit because 
			// the document may change in the meantime and the insert range may no longer be valid.
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: 'Implement all missing prefixes',
				isPreferred: true,
				command: {
					title: 'Implement all missing prefixes',
					command: 'mentor.action.fixMissingPrefixes',
					arguments: [document.uri, Array.from(undefinedPrefixes)]
				}
			});
		}

		for (let prefix of undefinedPrefixes) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: `Implement missing prefix: ${prefix}`,
				isPreferred: false,
				command: {
					title: `Implement missing prefix: ${prefix}`,
					command: 'mentor.action.fixMissingPrefixes',
					arguments: [document.uri, [prefix]]
				}
			});
		}

		if (unusedPrefixes.size > 0) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: `Remove all unused prefixes`,
				isPreferred: false,
				command: {
					title: `Remove all unsued prefixes`,
					command: 'mentor.action.removeUnusedPrefixes',
					arguments: [document.uri]
				}
			});
		}

		return result;
	}
}
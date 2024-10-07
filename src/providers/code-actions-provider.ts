import * as vscode from 'vscode';
import { FeatureProvider } from './feature-provider';
import { error } from 'console';

/**
 * A provider for RDF document code actions.
 */
export class CodeActionsProvider extends FeatureProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range, actionContext: vscode.CodeActionContext): Promise<vscode.CodeAction[]> {
		return this._provideFixMissingPrefixesActions(document, actionContext);
	}

	/**
	 * Get a code action for defining a missing prefixes.
	 * @param document An RDF document context.
	 * @param prefixes The prefixes to define.
	 * @returns Code actions for defining missing prefixes.
	 */
	private _provideFixMissingPrefixesActions(document: vscode.TextDocument, actionContext: vscode.CodeActionContext): vscode.CodeAction[] {
		const result: vscode.CodeAction[] = [];

		const documentDiagnostics = vscode.languages.getDiagnostics(document.uri);

		// Find all unused prefixes in the document, and add them as a repair option.
		const unusedPrefixes = this._getPrefixesWithErrorCode(document, documentDiagnostics, 'UnusedNamespacePrefixHint');

		if (unusedPrefixes.length > 0) {
			console.log(unusedPrefixes);

			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: 'Remove all unused prefixes',
				isPreferred: true,
				command: {
					title: 'Remove all unused prefixes',
					command: 'mentor.action.deletePrefixDefinitions',
					arguments: [document.uri, unusedPrefixes.map(p => p.split(' ')[1])]
				}
			});
		}

		// Find all undefined prefixes in the document, and add them as a repair option.
		const undefinedPrefixes = this._getPrefixesWithErrorCode(document, documentDiagnostics, 'NoNamespacePrefixError');

		if (undefinedPrefixes.length > 0) {
			// Fixing missing prefixes is implemented as a command instead of a static edit because 
			// the document may change in the meantime and the insert range may no longer be valid.
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: 'Implement all missing prefixes',
				isPreferred: true,
				command: {
					title: 'Implement all missing prefixes',
					command: 'mentor.action.implementPrefixDefinitions',
					arguments: [document.uri, Array.from(undefinedPrefixes)]
				}
			});
		}

		// 2. Find all unused prefixes in the context and add them as the second repair option.
		for (let prefix of this._getPrefixesWithErrorCode(document, actionContext.diagnostics, 'NoNamespacePrefixError')) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: `Implement missing prefix: ${prefix}`,
				isPreferred: false,
				command: {
					title: `Implement missing prefix: ${prefix}`,
					command: 'mentor.action.implementPrefixDefinitions',
					arguments: [document.uri, [prefix]]
				}
			});
		}

		return result;
	}

	/**
	 * Get prefixes with a specific error code from a diagnostic collection.
	 * @param document The document to search.
	 * @param diagnostics The diagnostics to search.
	 * @param errorCode The error code to search for.
	 * @returns The prefixes with the specified error code.
	 */
	private _getPrefixesWithErrorCode(document: vscode.TextDocument, diagnostics: Iterable<vscode.Diagnostic>, errorCode: string) {
		const result = new Set<string>();

		for (let diagnostic of diagnostics) {
			if (diagnostic.code === errorCode) {
				const prefix = document.getText(diagnostic.range).split(':')[0];

				if (prefix !== undefined) {
					result.add(prefix);
				}
			}
		}

		return Array.from(result);
	}
}
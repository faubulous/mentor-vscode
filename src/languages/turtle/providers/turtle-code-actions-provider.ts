import * as vscode from 'vscode';
import { Uri } from "@faubulous/mentor-rdf"
import { mentor } from '@src/mentor';
import { getIriFromIriReference } from '@src/utilities';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

/**
 * A provider for RDF document code actions.
 */
export class TurtleCodeActionsProvider extends TurtleFeatureProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix,
		vscode.CodeActionKind.Refactor,
	];

	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range, actionContext: vscode.CodeActionContext): Promise<vscode.CodeAction[]> {
		return [
			...this._provideRefactoringActions(document, range, actionContext),
			...this._provideFixMissingPrefixesActions(document, actionContext)
		];
	}

	/**
	 * Get code actions that provide refactoring actions for the given document.
	 * @param document An RDF document context.
	 * @param range The range of the current edit.
	 * @param actionContext The action context.
	 * @returns An array of code actions.
	 */
	private _provideRefactoringActions(document: vscode.TextDocument, range: vscode.Range, actionContext: vscode.CodeActionContext): vscode.CodeAction[] {
		const context = mentor.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return [];
		}

		const token = context.getTokenAtPosition(range.start);

		if(!token) {
			return [];
		}

		const result: vscode.CodeAction[] = [];

		const tokenName = token.tokenType?.tokenName;
		const tokenTypes = context.getTokenTypes();

		if (tokenName === tokenTypes.IRIREF) {
			const namespaceIri = Uri.getNamespaceIri(getIriFromIriReference(token.image));

			result.push({
				kind: vscode.CodeActionKind.Refactor,
				title: 'Define prefix for IRI',
				isPreferred: true,
				command: {
					title: 'Define prefix for IRI',
					command: 'mentor.command.implementPrefixForIri',
					arguments: [document.uri, namespaceIri, token]
				}
			});
		} else if (tokenName === tokenTypes.PREFIX || tokenName === tokenTypes.PNAME_NS) {
			result.push({
				kind: vscode.CodeActionKind.Refactor,
				title: 'Sort prefixes',
				isPreferred: true,
				command: {
					title: 'Sort prefixes',
					command: 'mentor.command.sortPrefixes',
					arguments: [document.uri, token]
				}
			});
		}

		return result;
	}

	/**
	 * Get a code action for defining missing prefixes.
	 * @param document An RDF document context.
	 * @param prefixes The prefixes to define.
	 * @returns Code actions for defining missing prefixes.
	 */
	private _provideFixMissingPrefixesActions(document: vscode.TextDocument, actionContext: vscode.CodeActionContext): vscode.CodeAction[] {
		const result: vscode.CodeAction[] = [];

		const documentDiagnostics = vscode.languages.getDiagnostics(document.uri);

		// 1. Find all unused prefixes in the whole document, and add them as a repair option on top.
		const undefinedPrefixes = this._getPrefixesWithErrorCode(document, documentDiagnostics, 'NoNamespacePrefixError');

		if (undefinedPrefixes.length > 0) {
			// Fixing missing prefixes is implemented as a command instead of a static edit because 
			// the document may change in the meantime and the insert range may no longer be valid.
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: 'Implement missing prefixes',
				isPreferred: true,
				command: {
					title: 'Implement missing prefixes',
					command: 'mentor.command.implementPrefixes',
					arguments: [document.uri, Array.from(undefinedPrefixes)]
				}
			});
		}

		// Note, the unused prefix diagnostics contain the _whole_ line of the prefix definition, so we need to extract the prefix from it.
		const unusedPrefixes = this._getPrefixesWithErrorCode(document, documentDiagnostics, 'UnusedNamespacePrefixHint');

		if (unusedPrefixes.length > 0) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: 'Remove unused prefixes',
				isPreferred: true,
				command: {
					title: 'Remove unused prefixes',
					command: 'mentor.command.deletePrefixes',
					arguments: [document.uri, unusedPrefixes]
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
					command: 'mentor.command.implementPrefixes',
					arguments: [document.uri, [prefix]]
				}
			});
		}

		for (let prefix of this._getPrefixesWithErrorCode(document, actionContext.diagnostics, 'UnusedNamespacePrefixHint')) {
			result.push({
				kind: vscode.CodeActionKind.QuickFix,
				title: `Remove unused prefix: ${prefix}`,
				isPreferred: false,
				command: {
					title: `Remove unused prefix: ${prefix}`,
					command: 'mentor.command.deletePrefixes',
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
				let prefix = document.getText(diagnostic.range).split(':')[0];

				if (errorCode === 'UnusedNamespacePrefixHint') {
					// Note: The unused prefix diagnostics contain the _whole_ line of the prefix definition, 
					// so we need to extract the prefix from it. At this point the line still contains the PREFIX keyword.
					prefix = prefix.split(' ')[1];
				}

				if (prefix !== undefined) {
					result.add(prefix);
				}
			}
		}

		return Array.from(result);
	}
}
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { DEPRECATED_WORKSPACE_URI_CODE } from '@src/languages/linters/deprecated-workspace-uri-linter';

export { DEPRECATED_WORKSPACE_URI_CODE };

/**
 * Regex to extract the canonical URI from the diagnostic message produced by `DeprecatedWorkspaceUriLinter`.
 * Matches: `Deprecated workspace URI scheme. Use 'workspace:///path' instead.`
 */
const CANONICAL_FROM_MESSAGE_REGEX = /Use '([^']+)' instead/;

/**
 * Provides Quick Fix code actions for deprecated `workspace:/path` URI diagnostics
 * emitted by the language server's {@link DeprecatedWorkspaceUriLinter}.
 *
 * This provider does **not** scan the document itself — it reacts to diagnostics
 * that already carry the {@link DEPRECATED_WORKSPACE_URI_CODE} code.
 */
export class WorkspaceUriCodeActionProvider implements vscode.CodeActionProvider {
	static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

	static readonly languages = [
		'ntriples',
		'nquads',
		'turtle',
		'n3',
		'trig',
		'sparql',
		'xml',
		'datalog'
	];

	constructor() {
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);

		const selector = WorkspaceUriCodeActionProvider.languages.map(language => ({ language }));

		context.subscriptions.push(
			vscode.languages.registerCodeActionsProvider(selector, this, {
				providedCodeActionKinds: WorkspaceUriCodeActionProvider.providedCodeActionKinds,
			}),
		);
	}

	/**
	 * Provides Quick Fix code actions for deprecated workspace URIs.
	 */
	provideCodeActions(document: vscode.TextDocument, _range: vscode.Range | vscode.Selection, actionContext: vscode.CodeActionContext): vscode.CodeAction[] {
		const actions: vscode.CodeAction[] = [];

		// Collect all workspace URI diagnostics in the action context (cursor-intersecting).
		const contextDiagnostics = actionContext.diagnostics.filter(d => d.code === DEPRECATED_WORKSPACE_URI_CODE);

		for (const diagnostic of contextDiagnostics) {
			const canonicalUri = extractCanonicalUri(diagnostic.message);

			if (!canonicalUri) {
				continue;
			}

			const fix = new vscode.CodeAction(
				`Update to '${canonicalUri}'`,
				vscode.CodeActionKind.QuickFix,
			);

			const edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, diagnostic.range, `<${canonicalUri}>`);

			fix.edit = edit;
			fix.diagnostics = [diagnostic];
			fix.isPreferred = true;

			actions.push(fix);
		}

		// "Fix all" action when there are multiple deprecated workspace URIs in the whole document.
		if (contextDiagnostics.length > 0) {
			const allDiagnostics = vscode.languages.getDiagnostics(document.uri)
				.filter(d => d.code === DEPRECATED_WORKSPACE_URI_CODE);

			if (allDiagnostics.length > 1) {
				const fixAll = new vscode.CodeAction(
					`Update all deprecated workspace URIs (${allDiagnostics.length})`,
					vscode.CodeActionKind.QuickFix,
				);

				const edit = new vscode.WorkspaceEdit();

				for (const d of allDiagnostics) {
					const uri = extractCanonicalUri(d.message);

					if (uri) {
						edit.replace(document.uri, d.range, `<${uri}>`);
					}
				}

				fixAll.edit = edit;

				actions.push(fixAll);
			}
		}

		return actions;
	}
}

/**
 * Extracts the canonical URI from a {@link DeprecatedWorkspaceUriLinter} diagnostic message.
 */
function extractCanonicalUri(message: string): string | undefined {
	return message.match(CANONICAL_FROM_MESSAGE_REGEX)?.[1];
}

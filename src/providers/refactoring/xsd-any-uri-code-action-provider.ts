import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { XSD_ANY_URI_LITERAL_CODE } from '@src/languages/diagnostics/xsd-any-uri-literal-lint-provider';

export { XSD_ANY_URI_LITERAL_CODE };

/**
 * Regex to extract the URI value from the diagnostic message produced by `XsdAnyUriLiteralLintProvider`.
 * Matches: `Use the IRI reference '<http://...>' instead of a typed string literal.`
 */
const IRI_FROM_MESSAGE_REGEX = /^Use the IRI reference '<(.+)>'/;

/**
 * Provides Quick Fix code actions for `"http(s)://..."^^xsd:anyURI` diagnostics
 * emitted by the language server's {@link XsdAnyUriLiteralLintProvider}.
 *
 * This provider does **not** scan the document itself — it reacts to diagnostics
 * that already carry the {@link XSD_ANY_URI_LITERAL_CODE} code.
 */
export class XsdAnyUriCodeActionProvider implements vscode.CodeActionProvider {
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

		const selector = XsdAnyUriCodeActionProvider.languages.map(language => ({ language }));

		context.subscriptions.push(
			vscode.languages.registerCodeActionsProvider(selector, this, {
				providedCodeActionKinds: XsdAnyUriCodeActionProvider.providedCodeActionKinds,
			}),
		);
	}

	/**
	 * Provides Quick Fix code actions for xsd:anyURI string literals.
	 */
	provideCodeActions(document: vscode.TextDocument, _range: vscode.Range | vscode.Selection, actionContext: vscode.CodeActionContext): vscode.CodeAction[] {
		const actions: vscode.CodeAction[] = [];

		// Collect all xsd:anyURI diagnostics in the action context (cursor-intersecting).
		const contextDiagnostics = actionContext.diagnostics.filter(d => d.code === XSD_ANY_URI_LITERAL_CODE);

		for (const diagnostic of contextDiagnostics) {
			const iriValue = extractIriFromMessage(diagnostic.message);

			if (!iriValue) {
				continue;
			}

			const newText = `<${iriValue}>`;

			const fix = new vscode.CodeAction(
				`Replace with IRI reference '${newText}'`,
				vscode.CodeActionKind.QuickFix,
			);

			const edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, diagnostic.range, newText);

			fix.edit = edit;
			fix.diagnostics = [diagnostic];
			fix.isPreferred = true;

			actions.push(fix);
		}

		// "Fix all" action when there are multiple such diagnostics in the whole document.
		if (contextDiagnostics.length > 0) {
			const allDiagnostics = vscode.languages.getDiagnostics(document.uri)
				.filter(d => d.code === XSD_ANY_URI_LITERAL_CODE);

			if (allDiagnostics.length > 1) {
				const fixAll = new vscode.CodeAction(
					`Replace all xsd:anyURI literals with IRI references (${allDiagnostics.length})`,
					vscode.CodeActionKind.QuickFix,
				);

				const edit = new vscode.WorkspaceEdit();

				for (const d of allDiagnostics) {
					const iri = extractIriFromMessage(d.message);

					if (iri) {
						edit.replace(document.uri, d.range, `<${iri}>`);
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
 * Extracts the IRI value from an {@link XsdAnyUriLiteralLintProvider} diagnostic message.
 */
function extractIriFromMessage(message: string): string | undefined {
	return message.match(IRI_FROM_MESSAGE_REGEX)?.[1];
}

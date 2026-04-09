import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { WorkspaceUri } from './workspace-uri';

/**
 * The diagnostic code used to identify deprecated workspace URI warnings.
 */
export const DEPRECATED_WORKSPACE_URI_CODE = 'DeprecatedWorkspaceUri';

/**
 * A regex that matches the old `workspace:/path` format (single slash after the colon)
 * but does NOT match the new `workspace:///path` format (triple slash).
 * 
 * Breakdown: `workspace:/` followed by a non-`/` character, then any non-whitespace/`>` characters.
 */
const DEPRECATED_URI_REGEX = /workspace:\/(?!\/)[^\s>]+/g;

/**
 * Provides diagnostics for deprecated `workspace:/path` URIs and code actions to fix them.
 */
export class WorkspaceUriDiagnosticProvider implements vscode.CodeActionProvider {
	private readonly _diagnosticCollection: vscode.DiagnosticCollection;
	
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

		this._diagnosticCollection = vscode.languages.createDiagnosticCollection('mentor-workspace-uri');

		const selector = WorkspaceUriDiagnosticProvider.languages.map(language => ({ language }));

		context.subscriptions.push(
			this._diagnosticCollection,
			vscode.languages.registerCodeActionsProvider(selector, this, {
				providedCodeActionKinds: WorkspaceUriDiagnosticProvider.providedCodeActionKinds,
			}),
			vscode.workspace.onDidChangeTextDocument(e => this.updateDiagnostics(e.document)),
			vscode.workspace.onDidOpenTextDocument(document => this.updateDiagnostics(document)),
			vscode.workspace.onDidCloseTextDocument(document => this._diagnosticCollection.delete(document.uri)),
		);

		// Scan all currently open documents.
		for (const document of vscode.workspace.textDocuments) {
			this.updateDiagnostics(document);
		}
	}

	/**
	 * Scans the document for deprecated workspace URIs and publishes diagnostics.
	 */
	updateDiagnostics(document: vscode.TextDocument): void {
		const diagnostics: vscode.Diagnostic[] = [];
		const text = document.getText();
		const regex = new RegExp(DEPRECATED_URI_REGEX, 'g');

		for (const match of text.matchAll(regex)) {
			const start = document.positionAt(match.index);
			const end = document.positionAt(match.index + match[0].length);
			const range = new vscode.Range(start, end);

			const diagnostic = new vscode.Diagnostic(
				range,
				`Deprecated workspace URI scheme. Use '${toCanonicalUri(match[0])}' instead.`,
				vscode.DiagnosticSeverity.Warning,
			);

			diagnostic.code = DEPRECATED_WORKSPACE_URI_CODE;
			diagnostic.source = 'Mentor';

			diagnostics.push(diagnostic);
		}

		this._diagnosticCollection.set(document.uri, diagnostics);
	}

	/**
	 * Provides Quick Fix code actions for deprecated workspace URIs.
	 */
	provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, _context: vscode.CodeActionContext): vscode.CodeAction[] {
		const actions: vscode.CodeAction[] = [];

		const text = document.getText();
		const regex = new RegExp(DEPRECATED_URI_REGEX, 'g');
		const matches: { range: vscode.Range; oldText: string }[] = [];

		for (const match of text.matchAll(regex)) {
			const start = document.positionAt(match.index);
			const end = document.positionAt(match.index + match[0].length);
			const matchRange = new vscode.Range(start, end);

			matches.push({ range: matchRange, oldText: match[0] });
		}

		// Find matches that intersect the cursor/selection range.
		const intersecting = matches.filter(m => range.intersection(m.range));

		for (const m of intersecting) {
			const newText = toCanonicalUri(m.oldText);

			const fix = new vscode.CodeAction(
				`Update to '${newText}'`,
				vscode.CodeActionKind.QuickFix,
			);

			const edit = new vscode.WorkspaceEdit();
			edit.replace(document.uri, m.range, newText);

			fix.edit = edit;
			fix.isPreferred = true;

			actions.push(fix);
		}

		// "Fix all" action when there are multiple deprecated URIs in the document.
		if (matches.length > 1 && intersecting.length > 0) {
			const fixAll = new vscode.CodeAction(
				`Update all deprecated workspace URIs (${matches.length})`,
				vscode.CodeActionKind.QuickFix,
			);

			const edit = new vscode.WorkspaceEdit();

			for (const m of matches) {
				edit.replace(document.uri, m.range, toCanonicalUri(m.oldText));
			}

			fixAll.edit = edit;

			actions.push(fixAll);
		}

		return actions;
	}
}

/**
 * Converts a deprecated `workspace:/path` URI to the new `workspace:///path` format.
 */
function toCanonicalUri(oldUri: string): string {
	return oldUri.replace(/^workspace:\/(?!\/)/, `${WorkspaceUri.uriScheme}:///`);
}

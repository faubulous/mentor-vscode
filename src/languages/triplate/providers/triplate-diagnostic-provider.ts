import * as vscode from 'vscode';
import { compile, isTemplate, TriplateError } from 'triplate';
import { TRIPLATE_LANGUAGE_IDS } from '@src/services/document/document-languages';
import { KeyedDebouncer } from '@src/utilities/debounce';

/**
 * Publishes diagnostics for triplate template syntax errors by running the triplate
 * compiler over template documents. The language server strips triplate frontmatter
 * before validating the underlying SPARQL/Turtle, so triplate's own parser errors
 * would otherwise go unreported.
 */
export class TriplateDiagnosticProvider implements vscode.Disposable {
	private readonly _collection: vscode.DiagnosticCollection;

	private readonly _subscriptions: vscode.Disposable[] = [];

	/**
	 * Debounces per-edit validation: `compile()` runs a full template parse and
	 * would otherwise execute on every keystroke in every open document.
	 */
	private readonly _changeDebouncer = new KeyedDebouncer<string>(300);

	constructor() {
		this._collection = vscode.languages.createDiagnosticCollection('triplate');

		this._subscriptions.push(
			this._collection,
			this._changeDebouncer,
			vscode.workspace.onDidOpenTextDocument(doc => this._validate(doc)),
			vscode.workspace.onDidChangeTextDocument(e =>
				this._changeDebouncer.schedule(e.document.uri.toString(), () => this._validate(e.document))),
			vscode.workspace.onDidCloseTextDocument(doc => {
				this._changeDebouncer.cancel(doc.uri.toString());
				this._collection.delete(doc.uri);
			}),
		);

		for (const doc of vscode.workspace.textDocuments) {
			this._validate(doc);
		}
	}

	private _validate(document: vscode.TextDocument): void {
		const text = document.getText();

		if (!TRIPLATE_LANGUAGE_IDS.has(document.languageId) || !isTemplate(text)) {
			this._collection.delete(document.uri);
		} else {
			try {
				compile(text);

				this._collection.delete(document.uri);
			} catch (error) {
				this._collection.set(document.uri, [this._toDiagnostic(document, error)]);
			}
		}
	}

	private _toDiagnostic(document: vscode.TextDocument, error: unknown): vscode.Diagnostic {
		const message = error instanceof Error ? error.message : 'Failed to compile triplate template.';
		const range = this._toRange(document, error);

		const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
		diagnostic.source = 'triplate';

		return diagnostic;
	}

	private _toRange(document: vscode.TextDocument, error: unknown): vscode.Range {
		// TriplateError carries 1-based line/column for the offending location.
		if (error instanceof TriplateError && error.line !== undefined) {
			const line = error.line - 1;
			const character = (error.column ?? 1) - 1;

			if (line >= 0 && line < document.lineCount) {
				const endCharacter = Math.max(character + 1, document.lineAt(line).range.end.character);
				return new vscode.Range(line, character, line, endCharacter);
			}
		}

		return new vscode.Range(0, 0, 0, 0);
	}

	dispose(): void {
		for (const sub of this._subscriptions) {
			sub.dispose();
		}
	}
}

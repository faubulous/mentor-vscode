import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';

/**
 * Provides a CodeLens on line 0 of every data cell (Turtle, TriG, N-Triples, etc.)
 * inside a Mentor notebook, showing the cell's current slug. Clicking the CodeLens
 * opens the slug edit input box.
 *
 * This provider is intentionally narrow in scope: it only emits a CodeLens when the
 * document URI scheme is `vscode-notebook-cell` AND the cell has a loaded context
 * with a non-empty slug. All other documents (regular files) are ignored.
 */
export class NotebookCellSlugCodeLensProvider implements vscode.CodeLensProvider {
	private _initialized = false;

	private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	private get _contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	private _initialize(): void {
		if (this._initialized) {
			return;
		}

		this._initialized = true;

		// Refresh CodeLenses whenever any document context changes (slug may have been updated).
		this._contextService.onDidChangeDocumentContext(() => this._onDidChangeCodeLenses.fire());
	}

	public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		this._initialize();
		// Only emit for notebook cells, not for standalone files.
		if (document.uri.scheme !== 'vscode-notebook-cell') {
			return [];
		}

		const ctx = this._contextService.contexts[document.uri.toString()];
		const slug = ctx?.slug;

		if (!slug) {
			return [];
		}

		const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));

		return [
			new vscode.CodeLens(range, {
				title: `$(tag)\u00A0#${slug}`,
				tooltip: 'Click to rename this cell\'s slug (graph URI fragment)',
				command: 'mentor.command.editNotebookCellSlug',
				arguments: [document.uri],
			})
		];
	}

	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}

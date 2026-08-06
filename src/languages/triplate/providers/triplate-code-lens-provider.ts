import * as vscode from 'vscode';
import { isTemplate } from 'triplate';
import { TriplateCompileCache } from '../triplate-compile-cache';

/**
 * Provides CodeLenses for triplate templates: a top-of-file "Run" lens that
 * prompts for parameter values, and a "Run" lens above each `example` block
 * that renders using the example's declared values.
 */
export class TriplateCodeLensProvider implements vscode.CodeLensProvider {
	/**
	 * The cache of compiled templates, used to determine the locations of `example` blocks.
	 */
	private readonly _cache = new TriplateCompileCache();
	
	/**
	 * Event emitter that signals when the CodeLenses should be refreshed.
	 */
	private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	/**
	 * Fires when the CodeLenses should be refreshed, e.g., when the compiled template cache changes.
	 */
	public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const text = document.getText();

		if (!isTemplate(text)) {
			return [];
		}

		const codeLenses: vscode.CodeLens[] = [];

		// Top-of-file Run lens (prompts for parameter values). For `.sparql`-language
		// documents, SparqlCodeLensProvider supplies this lens itself instead, since its
		// lens for the same range is the one that reliably ends up first on screen, so skip
		// it here to avoid a duplicate. For other Triplate-flavored languages (turtle, trig,
		// etc.) this provider is the only one contributing lenses, so it owns the Run lens.
		// The Run lens is shown in notebook cells too, so the lens group stays consistent
		// with how it appears in a standalone editor.
		if (document.languageId !== 'sparql') {
			const topRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));

			codeLenses.push(new vscode.CodeLens(topRange, {
				title: '$(play)\u00A0Run',
				tooltip: 'Render this template with parameter values',
				command: 'mentor.command.executeTriplateTemplate',
				arguments: [document.uri.toString()],
			}));
		}

		// Per-example Run lenses (render using the example's declared values).
		const compiled = this._cache.get(document);

		if (compiled) {
			// `triplate` tracks each example block's 1-based line/column.
			for (const example of compiled.examples) {
				const position = new vscode.Position(Math.max(0, example.line - 1), Math.max(0, example.column - 1));
				const range = new vscode.Range(position, position);

				codeLenses.push(new vscode.CodeLens(range, {
					title: `$(play)\u00A0Run`,
					tooltip: example.description ?? `Render the "${example.id}" example`,
					command: 'mentor.command.executeTriplateExample',
					arguments: [document.uri.toString(), example.id],
				}));
			}
		}

		return codeLenses;
	}

	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}

import * as vscode from 'vscode';
import { isTemplate } from 'triplate';
import { TriplateCompileCache } from '../triplate-compile-cache';

/**
 * Provides CodeLenses for triplate templates: a top-of-file "Execute" lens that
 * prompts for parameter values, and an "Execute" lens above each `example` block
 * that renders using the example's declared values.
 */
export class TriplateCodeLensProvider implements vscode.CodeLensProvider {
	private readonly _cache = new TriplateCompileCache();
	
	private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const text = document.getText();

		if (!isTemplate(text)) {
			return [];
		}

		const codeLenses: vscode.CodeLens[] = [];

		// Top-of-file Execute lens (prompts for parameter values). Emitted first so it
		// leads the document-wide lens group. For SPARQL the SparqlCodeLensProvider
		// suppresses its own Execute lens so this one is not duplicated.
		const topRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));

		codeLenses.push(new vscode.CodeLens(topRange, {
			title: '$(play)\u00A0Execute',
			tooltip: 'Render this template with parameter values',
			command: 'mentor.command.executeTriplateTemplate',
			arguments: [document.uri.toString()],
		}));

		// Per-example Execute lenses (render using the example's declared values).
		const compiled = this._cache.get(document);

		if (compiled) {
			// `triplate` tracks each example block's 1-based line/column.
			for (const example of compiled.examples) {
				const position = new vscode.Position(Math.max(0, example.line - 1), Math.max(0, example.column - 1));
				const range = new vscode.Range(position, position);

				codeLenses.push(new vscode.CodeLens(range, {
					title: `$(play)\u00A0Execute: ${example.id}`,
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

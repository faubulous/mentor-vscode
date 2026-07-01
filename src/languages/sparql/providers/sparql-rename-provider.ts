import * as vscode from 'vscode';
import { sparqlVariableSymbols, type IToken } from '@faubulous/mentor-rdf-parsers';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleRenameProvider } from '@src/languages/turtle/providers/turtle-rename-provider';

/**
 * Renaming for SPARQL. Inherits prefix / IRI / Triplate-template rename from
 * {@link TurtleRenameProvider} and replaces only the variable handling with a
 * scope-aware version: a sub-SELECT is its own variable scope, while projected
 * variables co-refer with the parent (see `sparqlVariableSymbols`).
 */
export class SparqlRenameProvider extends TurtleRenameProvider {
	/**
	 * Renames the variable under the cursor across every occurrence that co-refers
	 * with it in scope. Mirrors the Triplate template-rename path: find the symbol at
	 * the cursor, then rewrite every symbol sharing its `binding`. Falls back to the
	 * base textual rename when the document does not parse as SPARQL (mid-edit, or a
	 * Triplate template with `${…}` holes), in which case `sparqlVariableSymbols`
	 * returns `[]`.
	 */
	protected override _applyVariableRename(edits: vscode.WorkspaceEdit, document: vscode.TextDocument, context: TurtleDocument, token: IToken, position: vscode.Position, newName: string): void {
		const symbols = sparqlVariableSymbols(document.getText());
		const offset = document.offsetAt(position);
		const target = symbols.find(s => offset >= s.start && offset <= s.end);

		if (!target) {
			super._applyVariableRename(edits, document, context, token, position, newName);
			return;
		}

		for (const symbol of symbols.filter(s => s.binding === target.binding)) {
			// Replace the variable name only, keeping the leading `?`/`$` sigil.
			const range = new vscode.Range(document.positionAt(symbol.start + 1), document.positionAt(symbol.end));

			edits.replace(document.uri, range, newName);
		}
	}
}

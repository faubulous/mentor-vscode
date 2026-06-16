import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { isTemplate, symbols as templateSymbols, type TemplateSymbol } from 'triplate';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';
import { RdfToken, isVariableToken } from '@faubulous/mentor-rdf-parsers';
import { getIriFromToken } from '@src/utilities';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

/**
 * A `paramDecl` / `paramRef` / `bindingKey` symbol — the name-bearing kinds.
 */
type NamedSymbol = Extract<TemplateSymbol, { name: string }>;

/**
 * Provides renaming for URIs, resources labels and prefixes.
 */
export class TurtleRenameProvider extends TurtleFeatureProvider implements vscode.RenameProvider {
	/**
	 * Triplate symbol kinds that name a template parameter (declaration, reference, binding key).
	 */
	readonly _parameterSymbols = new Set(['paramDecl', 'paramRef', 'bindingKey']);

	private get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	public async prepareRename(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Range | null> {
		const context = this.contextService.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		// Triplate template-parameter rename (declaration ↔ ${ref} ↔ example binding key)
		// takes precedence: these sites are not RDF tokens, so the token logic below can't see them.
		const paramSymbol = this._templateParameterSymbolAt(document, position);

		if (paramSymbol) {
			return new vscode.Range(document.positionAt(paramSymbol.start), document.positionAt(paramSymbol.end));
		}

		const token = context.getTokenAtPosition(position);

		if (!token) {
			throw new Error('No token found at the given position.');
		}

		if (context.isPrefixTokenAtPosition(token, position)) {
			return this.getPrefixEditRange(token);
		} else {
			return this.getLabelEditRange(token);
		}
	}

	public provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.ProviderResult<vscode.WorkspaceEdit> {
		const edits = new vscode.WorkspaceEdit();
		const context = this.contextService.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return edits;
		}

		// Triplate template-parameter rename: rewrite every declaration, reference and
		// example binding key that names the same parameter, then stop (not an RDF symbol).
		if (this._applyTemplateParameterRename(edits, document, position, newName)) {
			return edits;
		}

		const token = context.getTokenAtPosition(position);

		if (!token) {
			return edits;
		}

		if (context.isPrefixTokenAtPosition(token, position)) {
			const i = token.image.indexOf(":");
			const prefix = token.image.substring(0, i);

			for (const t of context.tokens) {
				const tokenType = t.tokenType.name;

				switch (tokenType) {
					case RdfToken.PNAME_NS.name:
					case RdfToken.PNAME_LN.name: {
						const p = t.image.split(":")[0];

						if (p === prefix) {
							const r = this.getPrefixEditRange(t);

							if (!r) continue;

							edits.replace(document.uri, r, newName);
						}

						break;
					}
				}
			}

			if (edits.size > 0) {
				context.updateNamespacePrefix(prefix, newName);
			}
		} else if (isVariableToken(token)) {
			for (const t of context.tokens.filter(t => t.image === token.image)) {
				const r = this.getLabelEditRange(t);

				if (!r) continue;

				edits.replace(document.uri, r, newName);
			}
		} else {
			const u = getIriFromToken(context.namespaces, token);

			if (!u) return edits;

			const references = context.references[u];

			if (!references) return edits;

			for (let range of references) {
				const token = context.getTokenAtPosition(range.start);

				if (!token) continue;

				const editRange = this.getLabelEditRange(token);

				if (!editRange) continue;

				edits.replace(document.uri, editRange, newName);
			}
		}

		return edits;
	}

	/**
	 * Returns the Triplate template-parameter symbol at `position`, or `null` if the
	 * position is not on a declared parameter. Gated to names that have a `paramDecl`
	 * so loop-local variables (which have references but no declaration) are excluded.
	 */
	private _templateParameterSymbolAt(document: vscode.TextDocument, position: vscode.Position): NamedSymbol | null {
		const text = typeof document.getText === 'function' ? document.getText() : '';

		if (!isTemplate(text)) {
			return null;
		}

		let symbols: TemplateSymbol[];

		try {
			// Tolerant reader so rename works while the template is mid-edit.
			symbols = templateSymbols(text);
		} catch {
			return null;
		}

		const declared = new Set(symbols.filter(s => s.kind === 'paramDecl').map(s => s.name));
		const offset = document.offsetAt(position);

		for (const symbol of symbols) {
			if (this._parameterSymbols.has(symbol.kind)
				&& declared.has((symbol as NamedSymbol).name)
				&& offset >= symbol.start && offset <= symbol.end) {
				return symbol as NamedSymbol;
			}
		}

		return null;
	}

	/**
	 * If `position` is on a declared template parameter, replaces every declaration,
	 * reference and example binding key with `newName` and returns `true`. Otherwise
	 * returns `false` so the caller falls through to RDF-token rename.
	 */
	private _applyTemplateParameterRename(edits: vscode.WorkspaceEdit, document: vscode.TextDocument, position: vscode.Position, newName: string): boolean {
		const target = this._templateParameterSymbolAt(document, position);

		if (!target) {
			return false;
		}

		for (const symbol of templateSymbols(document.getText())) {
			if (this._parameterSymbols.has(symbol.kind) && (symbol as NamedSymbol).name === target.name) {
				const range = new vscode.Range(document.positionAt(symbol.start), document.positionAt(symbol.end));

				edits.replace(document.uri, range, newName);
			}
		}

		return true;
	}
}
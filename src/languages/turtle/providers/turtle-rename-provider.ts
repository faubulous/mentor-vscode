import * as vscode from 'vscode';
import { isTemplate, symbols as templateSymbols, type TemplateSymbol } from 'triplate';
import { IDocumentContextService } from '@src/services/document';
import { RdfToken, isVariableToken, type IToken } from '@faubulous/mentor-rdf-parsers';
import { getIriFromToken, getTokenAtPosition, isPrefixTokenAtPosition } from '@src/utilities';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@src/languages/turtle/turtle-feature-provider';

/**
 * Any name-bearing Triplate symbol (`paramDecl` / `paramRef` / `bindingKey` and the
 * loop `loopDecl` / `loopRef`).
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

	constructor(private readonly contextService: IDocumentContextService) {
		super();
	}

	public async prepareRename(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Range | null> {
		const context = this.contextService.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		// Triplate template rename (a parameter across its declaration ↔ ${ref} ↔ example
		// binding key, or a loop variable across its {% for %} declaration and in-scope
		// references) takes precedence: these sites are not RDF tokens, so the token logic
		// below can't see them.
		const symbols = this._templateSymbols(document);

		if (symbols) {
			const offset = document.offsetAt(position);
			const hit = this._templateRenameGroupAt(symbols, offset).find(s => offset >= s.start && offset <= s.end);

			if (hit) {
				return new vscode.Range(document.positionAt(hit.start), document.positionAt(hit.end));
			}
		}

		const token = getTokenAtPosition(context.tokens, position);

		if (!token) {
			throw new Error('No token found at the given position.');
		}

		if (isPrefixTokenAtPosition(token, position)) {
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

		// Triplate template rename: rewrite every site that renames together with the
		// symbol under the cursor (a parameter group by name, or a loop variable by
		// scope), then stop — these are not RDF symbols.
		const templateSymbolsAtUri = this._templateSymbols(document);

		if (templateSymbolsAtUri) {
			const offset = document.offsetAt(position);
			const group = this._templateRenameGroupAt(templateSymbolsAtUri, offset);

			if (group.length > 0) {
				for (const symbol of group) {
					const range = new vscode.Range(document.positionAt(symbol.start), document.positionAt(symbol.end));

					edits.replace(document.uri, range, newName);
				}

				return edits;
			}
		}

		const token = getTokenAtPosition(context.tokens, position);

		if (!token) {
			return edits;
		}

		if (isPrefixTokenAtPosition(token, position)) {
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
			this._applyVariableRename(edits, document, context, token, position, newName);
		} else {
			const u = getIriFromToken(context.namespaces, token);

			if (!u) return edits;

			const references = context.references[u];

			if (!references) return edits;

			for (let range of references) {
				const token = getTokenAtPosition(context.tokens, range.start);

				if (!token) continue;

				const editRange = this.getLabelEditRange(token);

				if (!editRange) continue;

				edits.replace(document.uri, editRange, newName);
			}
		}

		return edits;
	}

	/**
	 * Renames the variable `token` across the document. The base behaviour is purely
	 * textual: every token with the same image is rewritten. SPARQL overrides this with
	 * scope-aware resolution (see `SparqlRenameProvider`).
	 */
	protected _applyVariableRename(edits: vscode.WorkspaceEdit, document: vscode.TextDocument, context: TurtleDocument, token: IToken, _position: vscode.Position, newName: string): void {
		for (const t of context.tokens.filter(t => t.image === token.image)) {
			const range = this.getLabelEditRange(t);

			if (!range) continue;

			edits.replace(document.uri, range, newName);
		}
	}

	/**
	 * Returns the positioned Triplate symbols for `document`, or `null` if it is not a
	 * template or cannot be read. Uses the tolerant reader so rename keeps working while
	 * the template is mid-edit.
	 */
	private _templateSymbols(document: vscode.TextDocument): TemplateSymbol[] | null {
		const text = typeof document.getText === 'function' ? document.getText() : '';

		if (!isTemplate(text)) {
			return null;
		}

		try {
			return templateSymbols(text);
		} catch {
			return null;
		}
	}

	/**
	 * Returns every symbol that should be renamed together with the one at `offset`, or
	 * an empty array if `offset` is not on a renameable template symbol.
	 *
	 * Parameters group by `name`, gated to names that have a `paramDecl` so a stray
	 * reference without a declaration falls through to RDF rename. Loop variables group
	 * by `scope` id, which keeps shadowed and same-named loops independent.
	 */
	private _templateRenameGroupAt(symbols: TemplateSymbol[], offset: number): TemplateSymbol[] {
		const hit = symbols.find(s => offset >= s.start && offset <= s.end
			&& (this._parameterSymbols.has(s.kind) || s.kind === 'loopDecl' || s.kind === 'loopRef'));

		if (!hit) {
			return [];
		}

		if (hit.kind === 'loopDecl' || hit.kind === 'loopRef') {
			return symbols.filter(s => (s.kind === 'loopDecl' || s.kind === 'loopRef') && s.scope === hit.scope);
		}

		const name = (hit as NamedSymbol).name;

		if (!symbols.some(s => s.kind === 'paramDecl' && s.name === name)) {
			return [];
		}

		return symbols.filter(s => this._parameterSymbols.has(s.kind) && (s as NamedSymbol).name === name);
	}
}
import * as vscode from "vscode";
import { container } from 'tsyringe';
import { RdfToken } from "@faubulous/mentor-rdf-parsers";
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { TurtleCompletionItemProvider } from "@src/languages/turtle/providers";
import { TurtleDocument } from "@src/languages/turtle";

export class SparqlCompletionItemProvider extends TurtleCompletionItemProvider {
	/**
	 * The characters that trigger completion when typed.
	 * 
	 * @remarks The provider will also trigger on any position where the current 
	 * token starts with a trigger character, even if the character itself is 
	 * not yet typed (e.g. when completing an IRI that starts with '<', the 
	 * completion will trigger as soon as the user types '<' or when they start 
	 * typing an IRI that was auto-closed with '>' (e.g. <htt>), without 
	 * requiring them to type another trigger character. This is to provide a 
	 * smoother completion experience for IRIs.
	 */
	public readonly triggerCharacters = new Set([':', '<', '/']);

	/**
	 * Timeout in milliseconds to wait for fresh tokens from the language server
	 * when the stored tokens are stale at the moment a trigger-character completion fires.
	 */
	private readonly _tokenSyncTimeout = 2000;

	private get connectionService() {
		return container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
	}

	override async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, t: vscode.CancellationToken, completion: vscode.CompletionContext): Promise<vscode.CompletionItem[] | null> {
		const context = this.contextService.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		let n = context.getTokenIndexAtPosition(position);

		if (n < 1) {
			// Tokens are stale — the language server hasn't delivered an update yet.
			// Wait for the next token delivery before retrying.
			try {
				await this.contextService.onNextTokenDelivery(document.uri.toString(), this._tokenSyncTimeout);
			} catch {
				return null;
			}

			n = context.getTokenIndexAtPosition(position);

			if (n < 1) {
				return null;
			}
		}

		return this.getCompletionItems(document, context, n) as Promise<vscode.CompletionItem[] | null>;
	}

	override getCompletionItems(document: vscode.TextDocument, context: any, tokenIndex: number): vscode.ProviderResult<vscode.CompletionItem[]> {
		if (this.isGraphDefinitionContext(context, tokenIndex)) {
			return this.getGraphIriCompletionItems(document, context, tokenIndex);
		} else {
			return super.getCompletionItems(document, context, tokenIndex);
		}
	}

	/**
	 * Scans backwards from `tokenIndex` to find the index of the opening `<`
	 * that started the incomplete IRI being typed. Returns `tokenIndex` itself
	 * when the current token already starts with `<` (single-token IRI or
	 * auto-closed IRI such as `<htt>`). Returns -1 when no opening `<` is found.
	 */
	private findIriOpenIndex(context: TurtleDocument, tokenIndex: number): number {
		if (context.tokens[tokenIndex].image.startsWith('<')) {
			return tokenIndex;
		}

		// When a URL is partially typed (e.g. `<http://example.org/`), the lexer
		// cannot produce a single IRIREF token (which requires a closing `>`).
		// It emits `<` as an LT token, then the URL fragments as separate tokens.
		// Scan backwards to find that opening `<`.
		const stopImages = new Set([';', '{', '}', '(', ')', '>']);
		for (let i = tokenIndex - 1; i >= 0; i--) {
			const img = context.tokens[i].image;
			if (img === '<') {
				return i;
			}
			if (img.startsWith('<') || stopImages.has(img)) {
				break;
			}
		}

		return -1;
	}

	isGraphDefinitionContext(context: TurtleDocument, tokenIndex: number) {
		const n = this.findIriOpenIndex(context, tokenIndex);

		if (n < 0) {
			return false;
		}

		const previousToken = context.tokens[n - 1];

		switch (previousToken?.tokenType.name) {
			case RdfToken.GRAPH.name:
			case RdfToken.FROM.name:
			case RdfToken.NAMED.name:
				return true;
			default:
				return false;
		}
	}

	async getGraphIriCompletionItems(document: vscode.TextDocument, context: TurtleDocument, tokenIndex: number): Promise<vscode.CompletionItem[]> {
		const result = [];

		// The IRI being typed may span multiple tokens when it is incomplete (no closing `>`).
		// The lexer also skips characters it cannot tokenize (e.g. plain hostnames, path segments),
		// so concatenating token images would produce an incomplete URL. Instead, read the raw
		// document text from the opening `<` token through the current token.
		const iriOpenIndex = this.findIriOpenIndex(context, tokenIndex);
		const iriOpenToken = context.tokens[iriOpenIndex];
		const currentToken = context.tokens[tokenIndex];

		// Chevrotain positions are 1-based; VS Code positions are 0-based.
		// endColumn is the last char (1-based), so endColumn (without -1) is the exclusive end in 0-based terms.
		const iriStart = new vscode.Position(iriOpenToken.startLine! - 1, iriOpenToken.startColumn! - 1);
		const iriEnd = new vscode.Position(currentToken.endLine! - 1, currentToken.endColumn!);
		let value = document.getText(new vscode.Range(iriStart, iriEnd));

		if (value.startsWith('<')) {
			value = value.slice(1);
		}

		const alreadyClosed = value.endsWith('>');

		if (alreadyClosed) {
			value = value.slice(0, -1);
		}

		const graphs = await this.connectionService.getGraphsForDocument(document.uri);

		for (const iri of graphs.filter(g => g.startsWith(value))) {
			let label = iri.substring(value.length);

			// If the user has already typed a trigger character, we should 
			// not include it in the completion item label as this would result 
			// in duplication (e.g. 'workspace::' instead of 'ex:').
			if (this.triggerCharacters.has(label[0])) {
				label = label.slice(1);
			}

			const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Reference);
			item.detail = iri;
			item.insertText = new vscode.SnippetString(alreadyClosed ? label : label + '>');

			result.push(item);
		}

		return result;
	}
}
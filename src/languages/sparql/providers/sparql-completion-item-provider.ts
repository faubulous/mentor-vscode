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
			const image = context.tokens[i].image;

			if (image === '<') {
				return i;
			}
			if (image.startsWith('<') || stopImages.has(image)) {
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

	/**
	 * Collects graph IRIs from all indexed workspace documents and notebook cells.
	 * Each context's `graphIri` is a portable `workspace:` URI (or the raw URI for
	 * documents outside the workspace root). The current document is excluded.
	 */
	private getWorkspaceGraphUris(currentDocumentUri: vscode.Uri): string[] {
		const selfUri = currentDocumentUri.toString();
		const result: string[] = [];

		for (const ctx of Object.values(this.contextService.contexts ?? {})) {
			if (ctx.uri.toString() === selfUri) {
				continue;
			}

			result.push(ctx.graphIri.toString());
		}

		return result;
	}

	/**
	 * Reads the IRI text the user is currently typing from the raw document content.
	 * Handles multi-token IRIs (incomplete, no closing `>`) by reading from the `<`
	 * opening token through the current token.
	 * @returns The typed IRI value (without `<`/`>`), the closing state, the opening
	 *   token, and the end position — all needed to build replacement ranges.
	 */
	private _readTypedIri(document: vscode.TextDocument, context: TurtleDocument, tokenIndex: number) {
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

		return { value, alreadyClosed, iriOpenToken, iriEnd };
	}

	/**
	 * Merges remote endpoint graph IRIs and workspace document/cell IRIs into a
	 * single deduplicated list. Endpoint graphs come first.
	 */
	private async _mergeGraphUris(documentUri: vscode.Uri): Promise<string[]> {
		const endpointGraphs = await this.connectionService.getGraphsForDocument(documentUri);
		const workspaceGraphs = this.getWorkspaceGraphUris(documentUri);

		const seen = new Set<string>();
		const result: string[] = [];

		for (const iri of [...endpointGraphs, ...workspaceGraphs]) {
			if (!seen.has(iri)) {
				seen.add(iri);
				result.push(iri);
			}
		}

		return result;
	}

	/**
	 * Builds a single completion item for a graph IRI candidate, or returns `null`
	 * when the candidate does not match the typed value.
	 *
	 * Matching strategy:
	 * - **Prefix match**: IRI starts with the typed value → label is the remaining suffix.
	 * - **Substring match**: typed value is `workspace:///` + a search term that appears
	 *   anywhere in the IRI path/fragment → label is the full IRI and the item carries a
	 *   replacement range so the entire typed text is overwritten.
	 */
	private _buildGraphCompletionItem(
		iri: string,
		value: string,
		alreadyClosed: boolean,
		iriOpenToken: any,
		iriEnd: vscode.Position,
	): vscode.CompletionItem | null {
		const workspaceScheme = 'workspace:///';
		const substringTerm = value.startsWith(workspaceScheme) ? value.slice(workspaceScheme.length) : null;

		const isPrefixMatch = iri.startsWith(value);
		const isSubstringMatch =
			!isPrefixMatch &&
			substringTerm !== null &&
			substringTerm.length > 0 &&
			iri.startsWith(workspaceScheme) &&
			iri.slice(workspaceScheme.length).includes(substringTerm);

		if (!isPrefixMatch && !isSubstringMatch) {
			return null;
		}

		let label: string;
		let insertText: string;

		if (isPrefixMatch) {
			const suffix = iri.substring(value.length);

			// Strip a leading ':' from the display label to avoid visual duplication
			// when the user typed a namespace prefix (e.g. typed 'ex' → label ':Thing').
			// Only ':' is stripped, never '/' — stripping '/' would corrupt URI paths.
			// insertText always uses the full suffix so the inserted value is correct.
			label = (suffix[0] === ':') ? suffix.slice(1) : suffix;
			insertText = alreadyClosed ? suffix : suffix + '>';
		} else {
			// Substring match: replace everything the user typed with the full IRI.
			label = iri;
			insertText = alreadyClosed ? iri : iri + '>';
		}

		const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Reference);
		item.insertText = new vscode.SnippetString(insertText);

		// For workspace IRIs, set filterText to the path+fragment with '#' replaced by
		// a space. VS Code treats spaces as word boundaries in its fuzzy scorer, so slug
		// names after '#' (e.g. 'cell-1' in 'notebook.mnb#cell-1') become word starts
		// and the user can type 'cell' to filter to that cell even though the label
		// starts with the notebook filename.
		if (iri.startsWith(workspaceScheme)) {
			item.filterText = iri.slice(workspaceScheme.length).replace('#', ' ');
		}

		if (isSubstringMatch) {
			// Replace the entire typed text (from after '<' to the current position).
			// iriOpenToken.startColumn is 1-based; +0 gives us column of the char after '<'.
			const contentStart = new vscode.Position(iriOpenToken.startLine! - 1, iriOpenToken.startColumn!);
			item.range = new vscode.Range(contentStart, iriEnd);
		}

		return item;
	}

	async getGraphIriCompletionItems(document: vscode.TextDocument, context: TurtleDocument, tokenIndex: number): Promise<vscode.CompletionItem[]> {
		const { value, alreadyClosed, iriOpenToken, iriEnd } = this._readTypedIri(document, context, tokenIndex);
		const graphs = await this._mergeGraphUris(document.uri);
		const result: vscode.CompletionItem[] = [];

		for (const iri of graphs) {
			const item = this._buildGraphCompletionItem(iri, value, alreadyClosed, iriOpenToken, iriEnd);

			if (item) {
				result.push(item);
			}
		}

		return result;
	}
}
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
	public readonly triggerCharacters = new Set([':', '<']);

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

	isGraphDefinitionContext(context: TurtleDocument, tokenIndex: number) {
		let n = -1;

		if (context.tokens[tokenIndex].image.startsWith('<')) {
			// If the current token is either '<' or an IRI that was auto-closed with '>' (e.g. <htt>)
			n = tokenIndex;
		} else if (context.tokens[tokenIndex - 1]?.image === '<') {
			// If the token is not yet closed, then the previous token must be '<'
			n = tokenIndex - 1;
		} else {
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
		const token = context.tokens[tokenIndex];

		// The token might be completely or partially enclosed in angle brackets.
		let value = token.image;

		if (value.startsWith('<')) {
			value = value.slice(1);
		}

		if (value.endsWith('>')) {
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
			item.insertText = new vscode.SnippetString(label);

			result.push(item);
		}

		return result;
	}
}
import * as vscode from 'vscode';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { KeyedDebouncer } from '@src/utilities/debounce';
import { IDocumentContext } from './document-context.interface';
import { IDocumentTokenSource, TokenDelivery } from './document-token-source.interface';

/**
 * Token source that parses documents synchronously in the extension host and
 * coordinates concurrent document loads.
 *
 * Every supported document is parsed through its context's `parse()` method:
 * Turtle-family and SPARQL documents are tokenized (with a file-scoped blank
 * node ID generator so blank node identities are stable across reloads), and
 * RDF/XML documents are analyzed structurally. `waitForTokens` resolves
 * immediately for open documents and document edits are re-parsed after a
 * short debounce, publishing an unconsumed delivery that triggers a triple
 * reload. Load generations guard concurrent loads, and the timeout path
 * covers documents that are not open in the workspace.
 */
export class DocumentTokenSource implements IDocumentTokenSource {
	/**
	 * A map of pending token requests keyed by document URI.
	 * Used to coordinate between document loading and token delivery.
	 */
	private readonly _pendingTokenRequests = new Map<string, {
		resolve: (tokens: IToken[]) => void;
		reject: (error: Error) => void;
	}>();

	/**
	 * Tracks the current load generation per URI. Incremented each time
	 * a new load starts for a URI, allowing older loads to detect
	 * they have been superseded and should abandon their work.
	 */
	private readonly _loadGenerations = new Map<string, number>();

	/**
	 * Default timeout in milliseconds for waiting for tokens.
	 */
	private readonly _tokenWaitTimeout = 10000;

	/**
	 * Debounces re-parses of edited documents, one timer per document URI.
	 */
	private readonly _editDebouncer = new KeyedDebouncer(300);

	private readonly _changeSubscription: vscode.Disposable;

	private readonly _onDidDeliverTokens = new vscode.EventEmitter<TokenDelivery>();

	readonly onDidDeliverTokens = this._onDidDeliverTokens.event;

	/**
	 * @param _getContext Returns the document context for a URI, or `undefined` when
	 * none is loaded. Injected as a function to avoid a construction-order cycle with
	 * the document context service.
	 */
	constructor(private readonly _getContext: (uri: string) => IDocumentContext | undefined) {
		this._changeSubscription = vscode.workspace.onDidChangeTextDocument(e => this._handleTextDocumentChanged(e));
	}

	beginLoad(uri: string): number {
		const generation = (this._loadGenerations.get(uri) ?? 0) + 1;

		this._loadGenerations.set(uri, generation);

		return generation;
	}

	isCurrentLoad(uri: string, generation: number): boolean {
		return this._loadGenerations.get(uri) === generation;
	}

	waitForTokens(uri: string, timeout?: number, document?: vscode.TextDocument): Promise<IToken[]> {
		// Register the waiter first so that the local delivery below resolves it
		// through the same code path as any other delivery.
		const promise = this._registerTokenRequest(uri, timeout);

		const tokens = this._parseLocally(uri, document);

		if (tokens) {
			this.deliverTokens(uri, tokens);
		}

		return promise;
	}

	deliverTokens(uri: string, tokens: IToken[]): void {
		const pending = this._pendingTokenRequests.get(uri);

		if (pending) {
			pending.resolve(tokens);
		}

		this._onDidDeliverTokens.fire({ uri, tokens, consumed: pending !== undefined });
	}

	refreshTokens(uri: string): boolean {
		const tokens = this._parseLocally(uri);

		if (!tokens) {
			return false;
		}

		// Publish as an (unconsumed) delivery so the document context service
		// reloads the triples with the fresh parser output.
		this.deliverTokens(uri, tokens);

		return true;
	}

	/**
	 * Registers a pending token request for a document. If a previous request
	 * exists for the same URI, it is cancelled (rejected) first so that only one
	 * load at a time can be waiting for tokens per URI.
	 * @param uri The document URI.
	 * @param timeout Optional timeout in milliseconds.
	 * @returns A promise that resolves with the tokens or rejects on timeout/cancellation.
	 */
	private _registerTokenRequest(uri: string, timeout?: number): Promise<IToken[]> {
		// Cancel any existing pending request for this URI to prevent multiple
		// concurrent loads from racing against each other.
		this._cancelPendingTokenRequest(uri);

		return new Promise((resolve, reject) => {
			const timeoutMs = timeout ?? this._tokenWaitTimeout;

			const timeoutId = setTimeout(() => {
				this._pendingTokenRequests.delete(uri);
				reject(new Error(`Timeout waiting for tokens: ${uri}`));
			}, timeoutMs);

			this._pendingTokenRequests.set(uri, {
				resolve: (tokens) => {
					clearTimeout(timeoutId);
					this._pendingTokenRequests.delete(uri);
					resolve(tokens);
				},
				reject: (error) => {
					clearTimeout(timeoutId);
					this._pendingTokenRequests.delete(uri);
					reject(error);
				}
			});
		});
	}

	/**
	 * Cancel a pending token request for a document, if one exists.
	 * This rejects the existing promise, which causes any load awaiting it
	 * to enter its catch block and detect that it has been superseded.
	 * @param uri The document URI.
	 */
	private _cancelPendingTokenRequest(uri: string): void {
		const pending = this._pendingTokenRequests.get(uri);

		if (pending) {
			pending.reject(new Error('Load superseded by a newer request'));
		}
	}

	/**
	 * Re-parses a changed document after a debounce delay and publishes the
	 * result as an (unconsumed) delivery, which triggers a triple reload in the
	 * document context service.
	 */
	private _handleTextDocumentChanged(e: vscode.TextDocumentChangeEvent): void {
		const uri = e.document.uri.toString();

		if (!this._getContext(uri)) {
			return;
		}

		this._editDebouncer.schedule(uri, () => {
			const tokens = this._parseLocally(uri);

			if (tokens) {
				this.deliverTokens(uri, tokens);
			}
		});
	}

	/**
	 * Parses the current text of an open document and updates its context.
	 * @param uri The document URI.
	 * @param document The document to parse, when the caller already holds it.
	 * Falls back to searching `workspace.textDocuments` by URI when omitted.
	 * @returns The tokens (empty for structurally parsed documents such as
	 * RDF/XML), or `undefined` when the document is not open or has no context.
	 */
	private _parseLocally(uri: string, document?: vscode.TextDocument): IToken[] | undefined {
		const doc = document ?? vscode.workspace.textDocuments.find(d => d.uri.toString() === uri);
		const context = this._getContext(uri);

		if (!doc || !context) {
			return undefined;
		}

		return context.parse(doc.getText());
	}

	dispose(): void {
		this._editDebouncer.dispose();
		this._changeSubscription.dispose();

		for (const [, pending] of this._pendingTokenRequests) {
			pending.reject(new Error('DocumentTokenSource disposed'));
		}

		this._pendingTokenRequests.clear();
		this._loadGenerations.clear();
		this._onDidDeliverTokens.dispose();
	}
}

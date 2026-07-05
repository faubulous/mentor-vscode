import * as vscode from 'vscode';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { IDocumentTokenSource, TokenDelivery } from './document-token-source.interface';

/**
 * Token source backed by the language servers: tokens are pushed asynchronously
 * via the `mentor.message.updateContext` notification and delivered here by the
 * language clients. Coordinates waiting document loads with those deliveries and
 * tracks load generations so that superseded loads can abandon their work.
 */
export class DocumentTokenSyncService implements IDocumentTokenSource {
	/**
	 * A map of pending token requests keyed by document URI.
	 * Used to coordinate between document loading and language server token delivery.
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
	 * Default timeout in milliseconds for waiting for tokens from the language server.
	 */
	private readonly _tokenWaitTimeout = 10000;

	private readonly _onDidDeliverTokens = new vscode.EventEmitter<TokenDelivery>();

	readonly onDidDeliverTokens = this._onDidDeliverTokens.event;

	beginLoad(uri: string): number {
		const generation = (this._loadGenerations.get(uri) ?? 0) + 1;

		this._loadGenerations.set(uri, generation);

		return generation;
	}

	isCurrentLoad(uri: string, generation: number): boolean {
		return this._loadGenerations.get(uri) === generation;
	}

	waitForTokens(uri: string, timeout?: number): Promise<IToken[]> {
		// Cancel any existing pending request for this URI to prevent multiple
		// concurrent loads from racing against each other.
		this._cancelPendingTokenRequest(uri);

		return new Promise((resolve, reject) => {
			const timeoutMs = timeout ?? this._tokenWaitTimeout;

			const timeoutId = setTimeout(() => {
				this._pendingTokenRequests.delete(uri);
				reject(new Error(`Timeout waiting for tokens from language server: ${uri}`));
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

	deliverTokens(uri: string, tokens: IToken[]): void {
		const pending = this._pendingTokenRequests.get(uri);

		if (pending) {
			pending.resolve(tokens);
		}

		this._onDidDeliverTokens.fire({ uri, tokens, consumed: pending !== undefined });
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

	dispose(): void {
		for (const [, pending] of this._pendingTokenRequests) {
			pending.reject(new Error('DocumentTokenSyncService disposed'));
		}

		this._pendingTokenRequests.clear();
		this._loadGenerations.clear();
		this._onDidDeliverTokens.dispose();
	}
}

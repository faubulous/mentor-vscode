import * as vscode from 'vscode';
import { IToken } from '@faubulous/mentor-rdf-parsers';

/**
 * A single token delivery for a document.
 */
export interface TokenDelivery {
	/**
	 * The URI of the document the tokens belong to.
	 */
	uri: string;

	/**
	 * The delivered tokens.
	 */
	tokens: IToken[];

	/**
	 * `true` when a pending {@link IDocumentTokenSource.waitForTokens} request
	 * consumed this delivery, `false` when the delivery was unsolicited (e.g.
	 * triggered by a document edit).
	 */
	consumed: boolean;
}

/**
 * Supplies documents with tokens and coordinates concurrent document loads.
 *
 * This is the seam between the document context lifecycle and the token
 * producer. The current implementation ({@link DocumentTokenSyncService})
 * receives tokens pushed asynchronously by the language servers; a future
 * implementation may tokenize synchronously in the extension host instead.
 * The contract is deliberately transport-agnostic: consumers only wait for
 * tokens and track load generations, producers only deliver tokens.
 */
export interface IDocumentTokenSource extends vscode.Disposable {
	/**
	 * An event that is fired for every token delivery, after any pending
	 * {@link waitForTokens} request has been resolved.
	 */
	readonly onDidDeliverTokens: vscode.Event<TokenDelivery>;

	/**
	 * Starts a new load generation for a document. Any load started earlier for
	 * the same URI becomes stale and should abandon its work.
	 * @param uri The document URI.
	 * @returns The new load generation.
	 */
	beginLoad(uri: string): number;

	/**
	 * Indicates whether the given generation is still the newest load for a document.
	 * @param uri The document URI.
	 * @param generation A load generation returned by {@link beginLoad}.
	 */
	isCurrentLoad(uri: string, generation: number): boolean;

	/**
	 * Waits for the next token delivery for a document. If a previous wait exists
	 * for the same URI, it is cancelled (rejected) first so that only one load at
	 * a time can be waiting for tokens per URI.
	 * @param uri The document URI to wait for tokens.
	 * @param timeout Optional timeout in milliseconds.
	 * @returns A promise that resolves with the tokens or rejects on timeout/cancellation.
	 */
	waitForTokens(uri: string, timeout?: number): Promise<IToken[]>;

	/**
	 * Delivers tokens for a document. Resolves a pending {@link waitForTokens}
	 * request if one exists and fires {@link onDidDeliverTokens}.
	 * @param uri The document URI.
	 * @param tokens The delivered tokens.
	 */
	deliverTokens(uri: string, tokens: IToken[]): void;

	/**
	 * Requests fresh tokens for a document, e.g. during workspace re-indexing.
	 * @param uri The document URI.
	 * @returns `true` when this source produced fresh tokens itself; `false` when
	 * the caller must request them from the token producer (the language server).
	 */
	refreshTokens(uri: string): boolean;
}

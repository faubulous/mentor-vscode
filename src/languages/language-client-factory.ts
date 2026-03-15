import * as vscode from 'vscode';

/**
 * Options passed to the language client factory for creating a platform-specific language client.
 */
export interface LanguageClientFactoryOptions {
	/** Unique identifier for the language client channel. */
	channelId: string;
	/** Human-readable name of the language. */
	languageName: string;
	/** Relative path to the compiled language server module (e.g. `dist/turtle-language-server.js`). */
	serverPath: string;
	/** The language ID for document selectors. */
	languageId: string;
	/** The output channel for logging. */
	outputChannel: vscode.OutputChannel;
}

/**
 * A minimal interface for language clients that is compatible with both
 * `vscode-languageclient/browser` and `vscode-languageclient/node` implementations.
 */
export interface ILanguageClient {
	start(): Promise<void>;
	stop(): Promise<void> | void;
	onNotification(method: string, handler: (...params: any[]) => any): vscode.Disposable;
}

/**
 * Factory function type for creating platform-specific language clients.
 * Browser implementations use Web Workers; Node.js implementations use IPC transport.
 */
export type LanguageClientFactory = (
	context: vscode.ExtensionContext,
	options: LanguageClientFactoryOptions
) => ILanguageClient;

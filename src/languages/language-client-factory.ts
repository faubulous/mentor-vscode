import * as vscode from 'vscode';

/**
 * Options passed to the language client factory for creating a platform-specific language client.
 */
export interface LanguageClientFactoryOptions {
	/**
	 * Unique identifier for the language client channel.
	 */
	channelId: string;

	/**
	 * Human-readable name of the language.
	 */
	languageName: string;

	/**
	 * Relative path to the compiled language server module (e.g. `dist/turtle-language-server.js`).
	 */
	serverPath: string;

	/**
	 * The language ID for document selectors.
	 */
	languageId: string;

	/**
	 * The output channel for logging.
	 */
	outputChannel: vscode.OutputChannel;
}

/**
 * A minimal interface for language clients that is compatible with both
 * `vscode-languageclient/browser` and `vscode-languageclient/node` implementations.
 */
export interface ILanguageClient {
	/**
	 * Start the language client and establish a connection to the language server.
	 */
	start(): Promise<void>;

	/**
	 * Stop the language client and clean up resources. After stopping, the client should not be restarted.
	 */
	stop(): Promise<void> | void;

	/**
	 * Register a handler for notifications from the language server. The method should return a disposable that can be used to unregister the handler.
	 * @param method The name of the notification method to handle.
	 * @param handler The function to handle incoming notifications for the specified method.
	 * @returns A disposable that can be used to unregister the handler.
	 * @remarks The handler will be called with the parameters sent by the language server for the specified method.
	 * The exact types of the parameters depend on the language server's implementation and are not specified in this interface.
	 */
	onNotification(method: string, handler: (...params: any[]) => any): vscode.Disposable;
}

/**
 * Factory function type for creating platform-specific language clients.
 * Browser implementations use Web Workers; Node.js implementations use IPC transport.
 * @param context The extension context for registering disposables.
 * @param options The options for configuring the language client.
 * @returns An instance of ILanguageClient that can be started and stopped.
 * @remarks The factory should create but not start the language client. The caller will call `start()` on the returned client when ready.
 */
export type LanguageClientFactory = (context: vscode.ExtensionContext, options: LanguageClientFactoryOptions) => ILanguageClient;

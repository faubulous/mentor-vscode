/**
 * Interface for sending and receiving messages between a webview and its host.
 * @remarks This interface implements a unified API for webview messaging in webview components or notebook renderers.
 */
export interface WebviewMessaging<T extends WebviewMessage> {
	/**
	 * Sends a message to the webview.
	 * @param message The message to send to the webview.
	 */
	postMessage(message: T): void;

	/**
	 * Registers a handler for messages received from the webview.
	 * @param handler The function to call when a message is received.
	 */
	onMessage(handler: (message: T) => void): void;
}

/**
 * Base interface for messages sent between the webview and its host.
 */
export interface WebviewMessage {
	/**
	 * The unique identifier for the message.
	 */
	id: string;
}

/**
 * Common message type for executing VS Code commands from webviews.
 * Include this in your webview's message union type to enable command execution.
 */
export interface ExecuteCommandMessage extends WebviewMessage {
	id: 'ExecuteCommand';
	command: string;
	args?: any[];
}
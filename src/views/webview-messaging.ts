/**
 * Interface for sending and receiving messages between a webview and its host.
 * @remarks This interface implements a unified API for webview messaging in webview components or notebook renderers.
 */
export interface WebviewMessaging<MessageType extends WebviewMessage> {
	/**
	 * Sends a message to the webview.
	 * @param message The message to send to the webview.
	 */
	postMessage: (message: MessageType) => void;

	/**
	 * Registers a handler for messages received from the webview.
	 * @param handler The function to call when a message is received.
	 */
	onMessage: (handler: (message: MessageType) => void) => void;
}

/**
 * Base interface for messages sent between the webview and its host.
 */
export interface WebviewMessage {
	/**
	 * The unique identifier for the message.
	 */
	readonly id: string;
}
/**
 * Interface for sending and receiving messages between a webview and its host.
 * @remarks This interface implements a unified API for webview messaging in webview components or notebook renderers.
 */
export interface WebviewMessagingApi {
	/**
	 * Sends a message to the webview.
	 * @param msg The message to send to the webview.
	 */
	postMessage: (msg: any) => void;

	/**
	 * Registers a handler for messages received from the webview.
	 * @param handler The function to call when a message is received.
	 */
	onMessage: (handler: (msg: any) => void) => void;
}
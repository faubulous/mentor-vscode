import { WebviewMessage } from "./webview-messaging";

/**
 * A singleton manager for the VS Code API that provides methods 
 * to interact with the VS Code extension host.
 */
export class WebviewHost {
	private static _instance?: any;

	/**
	 * Get the singleton instance of the VS Code API manager.
	 * @returns The singleton instance of the VS Code API manager.
	 */
	public static getInstance() {
		if (!this._instance) {
			this._instance = (window as any).acquireVsCodeApi();
		}

		return this._instance;
	}

	/**
	 * Get the messaging API for the VS Code extension host.
	 * @returns An object with `postMessage` and `onMessage` methods for communication.
	 */
	public static getMessaging<T extends WebviewMessage>() {
		const vscode = this.getInstance();

		return {
			postMessage: (message: T) => vscode.postMessage(message),
			onMessage: (handler: (message: T) => void) => {
				const messageHandler = (event: MessageEvent) => handler(event.data);
				
				window.addEventListener('message', messageHandler);

				return () => window.removeEventListener('message', messageHandler);
			},
		};
	}

	/**
	 * Get the current state of the VS Code webview.
	 * @returns The current state of the VS Code webview.
	 */
	public static getState() {
		const vscode = this.getInstance();

		return vscode.getState();
	}

	/**
	 * Set the state of the VS Code webview.
	 * @param state The state to set for the VS Code webview.
	 */
	public static setState(state: any) {
		const vscode = this.getInstance();

		vscode.setState(state);
	}
}
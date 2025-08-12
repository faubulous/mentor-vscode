import { Component } from 'react';
import { WebviewMessaging, WebviewMessage } from './webview-messaging';

/**
 * Base class for webview components that provides common functionality.
 */
export abstract class WebviewComponent<P = {}, S = {}, M extends WebviewMessage = WebviewMessage> extends Component<P, S> {
	protected messaging?: WebviewMessaging<M>;

	componentDidMount() {
		console.debug('componentDidMount', this.messaging);
		
		this.messaging?.onMessage(message => this.componentDidReceiveMessage(message));
	}

	/**
	 * Called when a message is received from the extension host.
	 * @param message The message received from the extension host.
	 */
	componentDidReceiveMessage(message: M): void { }

	/**
	 * Adds a stylesheet to the HTML document header.
	 * @param id The ID of the stylesheet element.
	 * @param content The CSS content of the stylesheet.
	 */
	protected addStylesheet(id: string, content: string) {
		if (!document.getElementById(id)) {
			const style = document.createElement('style');
			style.id = id;
			style.textContent = content;

			document.head.appendChild(style);
		}
	}
}
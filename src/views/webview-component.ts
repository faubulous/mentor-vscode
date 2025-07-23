import { Component } from 'react';
import { WebviewMessagingApi } from './webview-messaging';

/**
 * Properties for the WebviewComponent.
 */
export interface WebviewComponentProps {
	/**
	 * Optional messaging API for communication with the extension host.
	 */
	messaging?: WebviewMessagingApi;
}

/**
 * Base class for webview components that provides common functionality.
 */
export class WebviewComponent<P extends WebviewComponentProps = WebviewComponentProps> extends Component<P> {
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

	/**
	 * Executes a command in the extension host.
	 * @param command The command to execute.
	 * @param args Optional arguments for the command.
	 */
	protected executeCommand(command: string, ...args: any[]) {
		if (this.props.messaging) {
			const message = {
				type: 'executeCommand',
				command: command,
				args: args
			}

			this.props.messaging.postMessage(message);
		} else {
			console.warn('No messaging API available to save results.');
		}
	}
}
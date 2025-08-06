import { Component } from 'react';
import { WebviewMessaging } from './webview-messaging';

/**
 * Properties for the WebviewComponent.
 */
export interface WebviewComponentProps {
	/**
	 * Optional messaging API for communication with the extension host.
	 */
	messaging?: {
		postMessage(message: any): void;
		onMessage?(handler: (message: any) => void): void;
	};
}

/**
 * Base class for webview components that provides common functionality.
 */
export class WebviewComponent<
	P extends WebviewComponentProps = WebviewComponentProps,
	S = {}
> extends Component<P, S> {
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
			this.props.messaging.postMessage({ id: 'ExecuteCommand', command, args });
		} else {
			console.warn('No messaging API available to save results.');
		}
	}
}
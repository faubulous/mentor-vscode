import { Component, RefObject, createRef } from 'react';
import { WebviewMessaging, WebviewMessage, ExecuteCommandMessage } from './webview-messaging';
import { WebviewHost } from './webview-host';

/**
 * Properties for webview components. Extend this interface to add additional properties.
 * All properties are optional to allow flexibility in component composition.
 */
export interface WebviewComponentProps {
	/**
	 * Optional messaging instance. If not provided, the component will initialize messaging automatically.
	 */
	messaging?: WebviewMessaging<any>;

	/**
	 * Optional array of stylesheets to inject. Each entry should be an object with `id` and `content`.
	 */
	stylesheets?: Array<{ id: string; content: string }>;
}

/**
 * Base class for webview components that provides common functionality including
 * automatic messaging initialization, stylesheet injection, and VS Code element helpers.
 * 
 * @typeParam P - Props type. Can be any type; if it includes `messaging`, it will be used.
 * @typeParam S - State type.
 * @typeParam M - Message type extending WebviewMessage.
 */
export abstract class WebviewComponent<
	P = {},
	S = {},
	M extends WebviewMessage = WebviewMessage
> extends Component<P, S> {
	protected messaging!: WebviewMessaging<M>;

	constructor(props: P) {
		super(props);

		// Auto-initialize messaging from props (if available) or WebviewHost (if in webview context)
		const propsWithMessaging = props as { messaging?: WebviewMessaging<M> };
		
		if (propsWithMessaging.messaging) {
			// Use messaging from props (e.g., notebook renderers pass messaging this way)
			this.messaging = propsWithMessaging.messaging;
		} else if (WebviewHost.isAvailable()) {
			// Fall back to WebviewHost only if acquireVsCodeApi is available
			this.messaging = WebviewHost.getMessaging<M>();
		}
		// Note: If neither is available, messaging will be undefined and components 
		// should handle this case or ensure messaging is always passed via props.
	}

	componentDidMount() {
		this.messaging?.onMessage(message => this.componentDidReceiveMessage(message));

		// Auto-inject stylesheets from props (if available)
		const propsWithStylesheets = this.props as { stylesheets?: Array<{ id: string; content: string }> };
		if (propsWithStylesheets.stylesheets) {
			for (const { id, content } of propsWithStylesheets.stylesheets) {
				this.addStylesheet(id, content);
			}
		}
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

	/**
	 * Executes a VS Code command via the messaging API.
	 * @param command The command ID to execute.
	 * @param args Optional arguments to pass to the command.
	 */
	protected executeCommand(command: string, ...args: any[]) {
		const message: ExecuteCommandMessage = { id: 'ExecuteCommand', command, args };
		this.messaging?.postMessage(message as unknown as M);
	}
}

/**
 * Options for creating a VS Code element ref with automatic event listener management.
 */
export interface VscodeElementRefOptions<E extends HTMLElement, V = any> {
	/**
	 * The event name to listen for (e.g., 'vsc-tabs-select', 'change').
	 */
	eventName: string;

	/**
	 * Callback invoked when the event fires.
	 * @param element The element that fired the event.
	 * @param event The event object.
	 */
	onEvent: (element: E, event: CustomEvent<V>) => void;
}

/**
 * Creates a ref callback that automatically manages event listener subscription/cleanup
 * for VS Code web components (vscode-elements).
 * 
 * @example
 * ```tsx
 * private tabsRef = createVscodeElementRef<VscodeTabs, { selectedIndex: number }>({
 *   eventName: 'vsc-tabs-select',
 *   onEvent: (element, event) => {
 *     this.setState({ selectedIndex: event.detail.selectedIndex });
 *   }
 * });
 * 
 * render() {
 *   return <vscode-tabs ref={this.tabsRef.callback}>...</vscode-tabs>;
 * }
 * ```
 * 
 * @param options Configuration for the element ref.
 * @returns An object with `callback` (for the ref prop) and `current` (the element or null).
 */
export function createVscodeElementRef<E extends HTMLElement, V = any>(
	options: VscodeElementRefOptions<E, V>
): { callback: (element: E | null) => void; current: E | null } {
	let currentElement: E | null = null;

	const handler = (event: Event) => {
		if (currentElement) {
			options.onEvent(currentElement, event as CustomEvent<V>);
		}
	};

	const callback = (element: E | null) => {
		// Cleanup previous element
		if (currentElement) {
			currentElement.removeEventListener(options.eventName, handler);
		}

		currentElement = element;

		// Setup new element
		if (element) {
			element.addEventListener(options.eventName, handler);
		}
	};

	return {
		callback,
		get current() {
			return currentElement;
		}
	};
}
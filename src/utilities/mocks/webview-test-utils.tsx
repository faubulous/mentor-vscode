import { ReactElement } from 'react';
import { RenderResult, fireEvent, render } from '@testing-library/react';
import { WebviewMessage } from '@src/views/webviews/webview-messaging';

/**
 * The tags of the VS Code web components the webviews render. In jsdom they are registered as
 * plain elements that carry a `value` and a `checked` property, so React can render and query
 * them; what the real components do with those properties is not under test here.
 */
const VSCODE_ELEMENT_TAGS = [
	'vscode-badge',
	'vscode-button',
	'vscode-checkbox',
	'vscode-checkbox-group',
	'vscode-context-menu',
	'vscode-context-menu-item',
	'vscode-divider',
	'vscode-icon',
	'vscode-label',
	'vscode-option',
	'vscode-progress-ring',
	'vscode-radio',
	'vscode-radio-group',
	'vscode-scrollable',
	'vscode-single-select',
	'vscode-tab-header',
	'vscode-tab-panel',
	'vscode-tabs',
	'vscode-textarea',
	'vscode-textfield',
	'vscode-toolbar-button',
	'vscode-toolbar-container'
];

/**
 * The extension host as a webview under test sees it: the messages the webview posted, and a
 * way to send it a message.
 */
export interface WebviewTestHost<M extends WebviewMessage = WebviewMessage> {
	/**
	 * The messages the webview posted, in order.
	 */
	posted: M[];

	/**
	 * Deliver a message to the webview, as the host does.
	 * @param message The message.
	 */
	receive(message: M): void;

	/**
	 * The state the webview persisted last.
	 */
	state: unknown;
}

/**
 * A stand-in for a VS Code web component: a plain element with the properties the components
 * are read and written through. A checkbox toggles and announces a change when clicked, as the
 * real one does.
 */
class VscodeElementStub extends HTMLElement {
	/**
	 * Resolves once the element rendered, as it does for a Lit element; the stub renders nothing.
	 */
	readonly updateComplete: Promise<boolean> = Promise.resolve(true);

	/**
	 * The items of a context menu, under the name of the property of `VscodeContextMenu` that holds
	 * them: React sets the `data` prop as this property where the element has one, so tests can read
	 * the items, and as a string attribute otherwise.
	 */
	data: unknown = undefined;

	/**
	 * Create the element and give a checkbox its click behaviour.
	 */
	constructor() {
		super();

		if (this.tagName.toLowerCase() === 'vscode-checkbox') {
			this.addEventListener('click', () => {
				this.checked = !this.checked;
				this.dispatchEvent(new Event('change', { bubbles: true }));
			});
		}
	}

	/**
	 * The value of the element, kept in its `value` attribute.
	 * @returns The value.
	 */
	get value(): string {
		return this.getAttribute('value') ?? '';
	}

	set value(value: string) {
		this.setAttribute('value', String(value));
	}

	/**
	 * Whether the element is checked, kept in its `checked` attribute.
	 * @returns `true` when checked.
	 */
	get checked(): boolean {
		return this.hasAttribute('checked');
	}

	set checked(checked: boolean) {
		if (checked) {
			this.setAttribute('checked', '');
		} else {
			this.removeAttribute('checked');
		}
	}
}

/**
 * The sink the stubbed VS Code API currently posts to. The API object itself is acquired once
 * per page and cached by the webview host, so the sink is swapped rather than the API.
 */
let currentHost: WebviewTestHost | undefined;

/**
 * Register the VS Code web components as plain elements, once per page. As jsdom lays nothing out,
 * scrolling an element into view does nothing.
 */
export function registerVscodeElements(): void {
	for (const tag of VSCODE_ELEMENT_TAGS) {
		if (!customElements.get(tag)) {
			customElements.define(tag, class extends VscodeElementStub { });
		}
	}

	Element.prototype.scrollIntoView ??= () => undefined;
}

/**
 * Install a stub of the VS Code webview API on the page and start a fresh host for it. Messages
 * sent to the webview arrive through the `message` event of the window, as they do in VS Code.
 * @returns The host, which records what the webview posts.
 */
export function installWebviewHost<M extends WebviewMessage = WebviewMessage>(): WebviewTestHost<M> {
	const host: WebviewTestHost<M> = {
		posted: [],
		state: undefined,
		receive: message => {
			window.dispatchEvent(new MessageEvent('message', { data: message }));
		}
	};

	currentHost = host as WebviewTestHost;

	const page = window as unknown as { acquireVsCodeApi?: () => unknown };

	page.acquireVsCodeApi ??= () => ({
		postMessage: (message: WebviewMessage) => currentHost?.posted.push(message),
		getState: () => currentHost?.state,
		setState: (state: unknown) => {
			if (currentHost) {
				currentHost.state = state;
			}
		}
	});

	return host;
}

/**
 * Render a webview component in jsdom with the VS Code API and web components stubbed. Call it
 * from a test file that runs in the jsdom environment (`// @vitest-environment jsdom`).
 * @param ui The component to render.
 * @returns The render result together with the host recording the component's messages.
 */
export function renderWebview<M extends WebviewMessage = WebviewMessage>(ui: ReactElement): RenderResult & { host: WebviewTestHost<M> } {
	registerVscodeElements();

	const host = installWebviewHost<M>();

	return { ...render(ui), host };
}

/**
 * Lay an element over the whole page, above everything laid out in it, as the cards and bars after
 * a popup would be; only what is in the top layer of the page stays in view over it.
 * @returns The element, which the test removes again.
 */
export function coverPage(): HTMLElement {
	const cover = document.createElement('div');

	cover.style.cssText = 'position: fixed; inset: 0; z-index: 1000; background: black;';
	document.body.append(cover);

	return cover;
}

/**
 * Type a text into a field, as the user does: a native text field or text area takes it as React
 * sees a change, a VS Code text field as the input event the component announces.
 * @param field The field.
 * @param text The text the field holds afterwards.
 */
export function typeInto(field: HTMLElement, text: string): void {
	if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
		fireEvent.change(field, { target: { value: text } });

		return;
	}

	(field as HTMLInputElement).value = text;
	fireEvent.input(field);
}
